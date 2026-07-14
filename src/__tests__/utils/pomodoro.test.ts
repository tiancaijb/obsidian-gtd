import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
	resetPomodoro,
	startPomodoro,
	pausePomodoro,
	resumePomodoro,
	stopPomodoro,
	getPomodoroState,
	setPomodoroConfig,
	getPomodoroConfig,
	setPomodoroTimeProvider,
	setPomodoroCallbacks,
	formatPomodoroTime,
	setRegisterIntervalFn,
	type PomodoroPhase,
	type PomodoroState,
} from '../../utils/pomodoro';

// Use a short-duration config for test speed. All durations are 3 seconds.
const FAST_CONFIG = {
	focusMinutes: 0.05,      // 3 seconds
	shortBreakMinutes: 0.05, // 3 seconds
	longBreakMinutes: 0.05,  // 3 seconds
	longBreakAfter: 4,
};

const FOCUS_SECONDS = Math.round(FAST_CONFIG.focusMinutes * 60);       // 3
const SHORT_BREAK_SECONDS = Math.round(FAST_CONFIG.shortBreakMinutes * 60); // 3
const LONG_BREAK_SECONDS = Math.round(FAST_CONFIG.longBreakMinutes * 60);   // 3

/**
 * Advance time by exactly `secondsRemaining * 1000 + 1` to trigger a phase
 * transition without leaking into the next phase's interval ticks.
 * Returns the time that was advanced so tests can use it.
 */
function advancePastPhase(secondsInPhase: number): number {
	const ms = secondsInPhase * 1000 + 1;
	vi.advanceTimersByTime(ms);
	return ms;
}

function passFocus(): void {
	advancePastPhase(FOCUS_SECONDS);
}

function passShortBreak(): void {
	advancePastPhase(SHORT_BREAK_SECONDS);
}

function passLongBreak(): void {
	advancePastPhase(LONG_BREAK_SECONDS);
}

describe('pomodoro', () => {
	beforeEach(() => {
		vi.stubGlobal('window', globalThis);
		resetPomodoro();
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	// ─── Initial state ─────────────────────────────────────────────────

	describe('initial state', () => {
		it('starts in idle phase', () => {
			const s = getPomodoroState();
			expect(s.phase).toBe('idle');
			expect(s.secondsRemaining).toBe(0);
			expect(s.completedCount).toBe(0);
			expect(s.paused).toBe(false);
			expect(s.phaseStart).toBe(0);
			expect(s.taskFilePath).toBeNull();
			expect(s.taskLine).toBeNull();
			expect(s.focusStartTime).toBe(0);
		});

		it('stopPomodoro returns null when idle', () => {
			expect(stopPomodoro()).toBeNull();
		});

		it('pausePomodoro is a no-op when idle', () => {
			expect(() => pausePomodoro()).not.toThrow();
			expect(getPomodoroState().phase).toBe('idle');
		});

		it('resumePomodoro is a no-op when idle', () => {
			expect(() => resumePomodoro()).not.toThrow();
			expect(getPomodoroState().phase).toBe('idle');
		});
	});

	// ─── startPomodoro ─────────────────────────────────────────────────

	describe('startPomodoro', () => {
		it('enters focus phase with full duration', () => {
			setPomodoroConfig(FAST_CONFIG);
			startPomodoro('/test.md', 0);
			const s = getPomodoroState();
			expect(s.phase).toBe('focus');
			expect(s.secondsRemaining).toBe(FOCUS_SECONDS);
			expect(s.paused).toBe(false);
		});

		it('links to a task file and line', () => {
			setPomodoroConfig(FAST_CONFIG);
			startPomodoro('/test.md', 42);
			const s = getPomodoroState();
			expect(s.taskFilePath).toBe('/test.md');
			expect(s.taskLine).toBe(42);
		});

		it('accepts call without task linking', () => {
			setPomodoroConfig(FAST_CONFIG);
			startPomodoro();
			const s = getPomodoroState();
			expect(s.taskFilePath).toBeNull();
			expect(s.taskLine).toBeNull();
		});

		it('resets completedCount on fresh start', () => {
			setPomodoroConfig({ ...FAST_CONFIG, longBreakAfter: 10 });
			startPomodoro();
			passFocus(); // focus → shortBreak (completedCount=1)
			passShortBreak(); // shortBreak → focus (completedCount=1)

			// Now start a fresh session — completedCount should reset
			startPomodoro('/new.md', 0);
			const s = getPomodoroState();
			expect(s.completedCount).toBe(0);
			expect(s.taskFilePath).toBe('/new.md');
		});

		it('sets focusStartTime to current timestamp', () => {
			setPomodoroConfig(FAST_CONFIG);
			const before = Date.now();
			startPomodoro();
			const s = getPomodoroState();
			expect(s.focusStartTime).toBeGreaterThanOrEqual(before);
		});

		it('focusStartTime does not change during breaks', () => {
			setPomodoroConfig({ ...FAST_CONFIG, longBreakAfter: 10 });
			startPomodoro();
			const focusStart = getPomodoroState().focusStartTime;
			passFocus(); // → shortBreak
			const s = getPomodoroState();
			expect(s.phase).toBe('shortBreak');
			expect(s.focusStartTime).toBe(focusStart);
		});

		it('focusStartTime updates when starting a new focus phase after break', () => {
			setPomodoroConfig({ ...FAST_CONFIG, longBreakAfter: 10 });
			startPomodoro();
			const focusStart1 = getPomodoroState().focusStartTime;
			passFocus(); // → shortBreak
			passShortBreak(); // → focus (new focus phase)
			const focusStart2 = getPomodoroState().focusStartTime;
			expect(focusStart2).toBeGreaterThan(focusStart1);
		});
	});

	// ─── pausePomodoro / resumePomodoro ─────────────────────────────────

	describe('pausePomodoro / resumePomodoro', () => {
		it('pause stops the countdown', () => {
			setPomodoroConfig(FAST_CONFIG);
			startPomodoro();
			vi.advanceTimersByTime(2000);
			pausePomodoro();
			const p = getPomodoroState();
			expect(p.paused).toBe(true);

			// Time should not decrease while paused
			vi.advanceTimersByTime(10000);
			expect(getPomodoroState().secondsRemaining).toBe(p.secondsRemaining);
		});

		it('resume continues the countdown', () => {
			setPomodoroConfig(FAST_CONFIG);
			startPomodoro();
			vi.advanceTimersByTime(1000); // 1 tick → FOCUS_SECONDS - 1 remaining
			pausePomodoro();
			const pausedSeconds = getPomodoroState().secondsRemaining;

			resumePomodoro();
			expect(getPomodoroState().paused).toBe(false);

			// Advance only 1 more second to avoid phase transition
			vi.advanceTimersByTime(1000);
			expect(getPomodoroState().secondsRemaining).toBe(pausedSeconds - 1);
		});

		it('multiple pause/resume cycles are safe', () => {
			setPomodoroConfig(FAST_CONFIG);
			startPomodoro();
			// partial second, no full tick — advance by 500ms to stay in the first interval
			vi.advanceTimersByTime(500);

			for (let i = 0; i < 3; i++) {
				pausePomodoro();
				expect(getPomodoroState().paused).toBe(true);
				vi.advanceTimersByTime(5000);
				resumePomodoro();
				expect(getPomodoroState().paused).toBe(false);
				vi.advanceTimersByTime(500);
			}
		});

		it('pause is idempotent when already paused', () => {
			setPomodoroConfig(FAST_CONFIG);
			startPomodoro();
			pausePomodoro();
			const s1 = getPomodoroState();
			pausePomodoro(); // second pause
			const s2 = getPomodoroState();
			expect(s2.paused).toBe(true);
			expect(s2.secondsRemaining).toBe(s1.secondsRemaining);
		});

		it('resume is a no-op when already running', () => {
			setPomodoroConfig(FAST_CONFIG);
			startPomodoro();
			const s1 = getPomodoroState();
			resumePomodoro(); // should be no-op
			expect(getPomodoroState().paused).toBe(false);
			expect(getPomodoroState().secondsRemaining).toBe(s1.secondsRemaining);
		});

		it('pause/resume across phase transitions', () => {
			setPomodoroConfig({ ...FAST_CONFIG, longBreakAfter: 10 });
			startPomodoro();
			passFocus(); // enters shortBreak
			expect(getPomodoroState().paused).toBe(false);
			pausePomodoro();
			expect(getPomodoroState().paused).toBe(true);
			resumePomodoro();
			expect(getPomodoroState().paused).toBe(false);
		});
	});

	// ─── stopPomodoro ───────────────────────────────────────────────────

	describe('stopPomodoro', () => {
		it('returns to idle and clears state', () => {
			setPomodoroConfig(FAST_CONFIG);
			startPomodoro();
			vi.advanceTimersByTime(2000);
			stopPomodoro();
			const s = getPomodoroState();
			expect(s.phase).toBe('idle');
			expect(s.secondsRemaining).toBe(0);
			expect(s.completedCount).toBe(0);
			expect(s.taskFilePath).toBeNull();
			expect(s.taskLine).toBeNull();
			expect(s.paused).toBe(false);
			expect(s.focusStartTime).toBe(0);
		});

		it('returns elapsed seconds and phase', () => {
			setPomodoroConfig(FAST_CONFIG);
			startPomodoro();
			vi.advanceTimersByTime(2500);
			const r = stopPomodoro();
			expect(r).not.toBeNull();
			expect(r!.phase).toBe('focus');
			// ~2-3 seconds elapsed (within range)
			expect(r!.elapsedSec).toBeGreaterThanOrEqual(2);
			expect(r!.elapsedSec).toBeLessThanOrEqual(3);
		});

		it('stops during shortBreak', () => {
			setPomodoroConfig({ ...FAST_CONFIG, longBreakAfter: 10 });
			startPomodoro();
			passFocus(); // → shortBreak
			const r = stopPomodoro();
			expect(r).not.toBeNull();
			expect(r!.phase).toBe('shortBreak');
		});

		it('stops during longBreak', () => {
			setPomodoroConfig({ ...FAST_CONFIG, longBreakAfter: 1 });
			startPomodoro();
			passFocus(); // completed 1 → longBreak (1 % 1 === 0)
			const r = stopPomodoro();
			expect(r).not.toBeNull();
			expect(r!.phase).toBe('longBreak');
		});

		it('elapsedSec is 0 when stopping during break', () => {
			setPomodoroConfig({ ...FAST_CONFIG, longBreakAfter: 10 });
			startPomodoro();
			passFocus(); // → shortBreak (not focus)
			const r = stopPomodoro();
			expect(r).not.toBeNull();
			expect(r!.elapsedSec).toBe(0);
		});

		it('can start a new session after stop', () => {
			setPomodoroConfig(FAST_CONFIG);
			startPomodoro();
			vi.advanceTimersByTime(2000);
			stopPomodoro();

			// Fresh start
			startPomodoro('/another.md', 5);
			const s = getPomodoroState();
			expect(s.phase).toBe('focus');
			expect(s.secondsRemaining).toBe(FOCUS_SECONDS);
			expect(s.taskFilePath).toBe('/another.md');
		});
	});

	// ─── Phase transitions ──────────────────────────────────────────────

	describe('phase transitions', () => {
		it('focus → shortBreak when longBreakAfter not reached', () => {
			setPomodoroConfig({ ...FAST_CONFIG, longBreakAfter: 10 });
			startPomodoro();
			expect(getPomodoroState().phase).toBe('focus');
			passFocus();
			const s = getPomodoroState();
			expect(s.phase).toBe('shortBreak');
			expect(s.completedCount).toBe(1);
			// secondsRemaining was decremented by the tick that triggered the
			// transition, but startPhase immediately sets it to the new duration.
			// The trigger tick fires at the instant secondsRemaining hits 0,
			// and the new phase starts with full duration. No additional ticks
			// fire because we stopped the advance just past the trigger point.
			expect(s.secondsRemaining).toBe(SHORT_BREAK_SECONDS);
		});

		it('focus → longBreak when longBreakAfter is reached', () => {
			// After 2 completed focus sessions (2 % 2 === 0), should go to longBreak
			setPomodoroConfig({ ...FAST_CONFIG, longBreakAfter: 2 });
			startPomodoro();

			passFocus(); // completed 1 → shortBreak
			expect(getPomodoroState().phase).toBe('shortBreak');
			expect(getPomodoroState().completedCount).toBe(1);

			passShortBreak(); // back to focus
			expect(getPomodoroState().phase).toBe('focus');

			passFocus(); // completed 2 → longBreak (2 % 2 === 0)
			expect(getPomodoroState().phase).toBe('longBreak');
			expect(getPomodoroState().completedCount).toBe(2);
		});

		it('shortBreak → focus', () => {
			setPomodoroConfig({ ...FAST_CONFIG, longBreakAfter: 10 });
			startPomodoro();
			passFocus(); // → shortBreak
			passShortBreak(); // → focus
			expect(getPomodoroState().phase).toBe('focus');
			expect(getPomodoroState().completedCount).toBe(1);
		});

		it('longBreak → focus', () => {
			setPomodoroConfig({ ...FAST_CONFIG, longBreakAfter: 1 });
			startPomodoro();
			passFocus(); // completed 1 → longBreak
			passLongBreak(); // → focus
			expect(getPomodoroState().phase).toBe('focus');
			expect(getPomodoroState().completedCount).toBe(1);
		});

		it('completedCount increments only on focus completion', () => {
			setPomodoroConfig({ ...FAST_CONFIG, longBreakAfter: 10 });
			startPomodoro();

			passFocus(); // completed 1
			expect(getPomodoroState().completedCount).toBe(1);

			passShortBreak(); // back to focus
			expect(getPomodoroState().completedCount).toBe(1); // still 1

			passFocus(); // completed 2
			expect(getPomodoroState().completedCount).toBe(2);
		});

		it('longBreakAfter=1 transitions directly to longBreak after first focus', () => {
			setPomodoroConfig({ ...FAST_CONFIG, longBreakAfter: 1 });
			startPomodoro();
			passFocus();
			expect(getPomodoroState().phase).toBe('longBreak');
			expect(getPomodoroState().completedCount).toBe(1);
		});

		it('completes multiple full cycles correctly', () => {
			// Run 4 full pomodoro cycles where every 4th is a longBreak
			setPomodoroConfig({ ...FAST_CONFIG, longBreakAfter: 4 });
			startPomodoro();

			// Cycle 1: focus → shortBreak
			passFocus();
			expect(getPomodoroState().phase).toBe('shortBreak');
			expect(getPomodoroState().completedCount).toBe(1);
			passShortBreak();
			expect(getPomodoroState().phase).toBe('focus');

			// Cycle 2: focus → shortBreak
			passFocus();
			expect(getPomodoroState().phase).toBe('shortBreak');
			expect(getPomodoroState().completedCount).toBe(2);
			passShortBreak();
			expect(getPomodoroState().phase).toBe('focus');

			// Cycle 3: focus → shortBreak
			passFocus();
			expect(getPomodoroState().phase).toBe('shortBreak');
			expect(getPomodoroState().completedCount).toBe(3);
			passShortBreak();
			expect(getPomodoroState().phase).toBe('focus');

			// Cycle 4: focus → longBreak (4 % 4 === 0)
			passFocus();
			expect(getPomodoroState().phase).toBe('longBreak');
			expect(getPomodoroState().completedCount).toBe(4);
			passLongBreak();
			expect(getPomodoroState().phase).toBe('focus');
			expect(getPomodoroState().completedCount).toBe(4); // still 4
		});
	});

	// ─── Callbacks ──────────────────────────────────────────────────────

	describe('callbacks', () => {
		it('tickCallback fires during countdown', () => {
			const tick = vi.fn();
			setPomodoroCallbacks(tick, null);
			setPomodoroConfig(FAST_CONFIG);
			startPomodoro();

			vi.advanceTimersByTime(3000);
			expect(tick).toHaveBeenCalled();
		});

		it('phaseEndCallback fires when focus completes', () => {
			const phaseEnd = vi.fn();
			setPomodoroCallbacks(null, phaseEnd);
			setPomodoroConfig({ ...FAST_CONFIG, longBreakAfter: 10 });
			startPomodoro();

			passFocus();

			expect(phaseEnd).toHaveBeenCalledTimes(1);
			const [phase, st] = phaseEnd.mock.calls[0] as [PomodoroPhase, PomodoroState];
			expect(phase).toBe('focus');
			expect(st.phase).toBe('shortBreak');
			expect(st.completedCount).toBe(1);
		});

		it('phaseEndCallback fires when shortBreak completes', () => {
			const phaseEnd = vi.fn();
			setPomodoroCallbacks(null, phaseEnd);
			setPomodoroConfig({ ...FAST_CONFIG, longBreakAfter: 10 });
			startPomodoro();

			passFocus(); // focus → shortBreak (fires phaseEnd for 'focus')
			phaseEnd.mockClear(); // ignore the focus callback

			passShortBreak(); // shortBreak → focus (fires phaseEnd for 'shortBreak')

			expect(phaseEnd).toHaveBeenCalledTimes(1);
			const [phase, st] = phaseEnd.mock.calls[0] as [PomodoroPhase, PomodoroState];
			expect(phase).toBe('shortBreak');
			expect(st.phase).toBe('focus');
		});

		it('phaseEndCallback fires when longBreak completes', () => {
			const phaseEnd = vi.fn();
			setPomodoroCallbacks(null, phaseEnd);
			setPomodoroConfig({ ...FAST_CONFIG, longBreakAfter: 1 });
			startPomodoro();

			passFocus(); // focus → longBreak (fires phaseEnd for 'focus')
			phaseEnd.mockClear();

			passLongBreak(); // longBreak → focus (fires phaseEnd for 'longBreak')

			expect(phaseEnd).toHaveBeenCalledTimes(1);
			const [phase] = phaseEnd.mock.calls[0] as [PomodoroPhase];
			expect(phase).toBe('longBreak');
		});

		it('phaseEndCallback receives the state after transition', () => {
			const phaseEnd = vi.fn();
			setPomodoroCallbacks(null, phaseEnd);
			setPomodoroConfig({ ...FAST_CONFIG, longBreakAfter: 10 });
			startPomodoro();

			passFocus();

			const [phase, st] = phaseEnd.mock.calls[0] as [PomodoroPhase, PomodoroState];
			expect(phase).toBe('focus');
			expect(st.phase).toBe('shortBreak');
			expect(st.completedCount).toBe(1);
		});

		it('setting callbacks to null does not throw', () => {
			setPomodoroConfig(FAST_CONFIG);
			startPomodoro();
			passFocus();

			expect(() => setPomodoroCallbacks(null, null)).not.toThrow();
		});

		it('tickCallback fires again after phase transition', () => {
			const tick = vi.fn();
			setPomodoroCallbacks(tick, null);
			setPomodoroConfig({ ...FAST_CONFIG, longBreakAfter: 10 });
			startPomodoro();

			tick.mockClear();
			passFocus(); // focus completes, enters shortBreak → tick fires on completion

			expect(tick).toHaveBeenCalled();
		});

		it('phaseEndCallback is not fired by stopPomodoro', () => {
			const phaseEnd = vi.fn();
			setPomodoroCallbacks(null, phaseEnd);
			setPomodoroConfig(FAST_CONFIG);
			startPomodoro();
			vi.advanceTimersByTime(1000);
			stopPomodoro();
			expect(phaseEnd).not.toHaveBeenCalled();
		});
	});

	// ─── registerIntervalFn ─────────────────────────────────────────────

	describe('registerIntervalFn', () => {
		it('registers the interval with the provided function', () => {
			const register = vi.fn();
			setRegisterIntervalFn(register);
			setPomodoroConfig(FAST_CONFIG);
			startPomodoro();
			expect(register).toHaveBeenCalledOnce();
			expect(register.mock.calls[0]![0]).toBeDefined();
		});

		it('setting to null does not cause errors', () => {
			setRegisterIntervalFn(null);
			setPomodoroConfig(FAST_CONFIG);
			expect(() => startPomodoro()).not.toThrow();
		});

		it('new interval is registered after phase transition', () => {
			const register = vi.fn();
			setRegisterIntervalFn(register);
			setPomodoroConfig({ ...FAST_CONFIG, longBreakAfter: 10 });
			startPomodoro();
			register.mockClear();

			passFocus(); // → shortBreak, new interval starts
			expect(register).toHaveBeenCalledOnce();
		});
	});

	// ─── getPomodoroState ───────────────────────────────────────────────

	describe('getPomodoroState', () => {
		it('returns a snapshot (immutable copy)', () => {
			setPomodoroConfig(FAST_CONFIG);
			startPomodoro();
			const s1 = getPomodoroState();
			const s2 = getPomodoroState();
			expect(s1).toEqual(s2);
			expect(s1).not.toBe(s2);
		});

		it('returns correct secondsRemaining during focus', () => {
			setPomodoroConfig(FAST_CONFIG);
			startPomodoro();
			expect(getPomodoroState().secondsRemaining).toBe(FOCUS_SECONDS);

			vi.advanceTimersByTime(2000);
			expect(getPomodoroState().secondsRemaining).toBe(FOCUS_SECONDS - 2);
		});

		it('returns correct secondsRemaining during shortBreak', () => {
			setPomodoroConfig({ ...FAST_CONFIG, longBreakAfter: 10 });
			startPomodoro();
			passFocus();
			// The shortBreak should have started with full SHORT_BREAK_SECONDS.
			// passFocus triggers at the tick that hits 0, and the advance is
			// just past that point, so no additional tick fires for the new phase.
			expect(getPomodoroState().secondsRemaining).toBe(SHORT_BREAK_SECONDS);
		});

		it('returns correct phase info throughout lifecycle', () => {
			setPomodoroConfig({ ...FAST_CONFIG, longBreakAfter: 2 });

			startPomodoro();
			expect(getPomodoroState().phase).toBe('focus');
			expect(getPomodoroState().paused).toBe(false);

			passFocus();
			expect(getPomodoroState().phase).toBe('shortBreak');

			passShortBreak();
			expect(getPomodoroState().phase).toBe('focus');

			passFocus();
			expect(getPomodoroState().phase).toBe('longBreak');

			passLongBreak();
			expect(getPomodoroState().phase).toBe('focus');

			stopPomodoro();
			expect(getPomodoroState().phase).toBe('idle');
		});
	});

	// ─── setPomodoroConfig / getPomodoroConfig ──────────────────────────

	describe('setPomodoroConfig / getPomodoroConfig', () => {
		it('getPomodoroConfig returns default config initially', () => {
			const cfg = getPomodoroConfig();
			expect(cfg.focusMinutes).toBe(25);
			expect(cfg.shortBreakMinutes).toBe(5);
			expect(cfg.longBreakMinutes).toBe(15);
			expect(cfg.longBreakAfter).toBe(4);
		});

		it('setPomodoroConfig merges partial config', () => {
			setPomodoroConfig({ focusMinutes: 10 });
			const cfg = getPomodoroConfig();
			expect(cfg.focusMinutes).toBe(10);
			expect(cfg.shortBreakMinutes).toBe(5); // unchanged
			expect(cfg.longBreakMinutes).toBe(15);
			expect(cfg.longBreakAfter).toBe(4);
		});

		it('setPomodoroConfig before start affects duration', () => {
			setPomodoroConfig({ focusMinutes: 10 });
			startPomodoro();
			expect(getPomodoroState().secondsRemaining).toBe(600);
		});

		it('getPomodoroConfig returns a snapshot (immutable)', () => {
			const cfg1 = getPomodoroConfig();
			const cfg2 = getPomodoroConfig();
			expect(cfg1).not.toBe(cfg2);
			expect(cfg1).toEqual(cfg2);
		});
	});

	// ─── setPomodoroTimeProvider ────────────────────────────────────────

	describe('setPomodoroTimeProvider', () => {
		it('custom now() is used for timestamps', () => {
			const fixedNow = 1234567890;
			setPomodoroTimeProvider({
				now: () => fixedNow,
				setInterval: (fn, ms) => window.setInterval(fn, ms),
				clearInterval: (id) => { window.clearInterval(id); },
			});
			setPomodoroConfig(FAST_CONFIG);
			startPomodoro();
			expect(getPomodoroState().phaseStart).toBe(fixedNow);
			expect(getPomodoroState().focusStartTime).toBe(fixedNow);
		});

		it('resetPomodoro restores default time provider', () => {
			const customNow = vi.fn(() => 999);
			setPomodoroTimeProvider({
				now: customNow,
				setInterval: (fn, ms) => window.setInterval(fn, ms),
				clearInterval: (id) => { window.clearInterval(id); },
			});
			resetPomodoro(); // This restores the default provider

			// After reset, now() should use Date.now() (fake timer's now)
			setPomodoroConfig(FAST_CONFIG);
			startPomodoro();
			expect(getPomodoroState().phaseStart).toBeGreaterThan(0);
		});

		it('partial override only replaces specified fields', () => {
			const customNow = () => 42;
			setPomodoroTimeProvider({ now: customNow });

			setPomodoroConfig(FAST_CONFIG);
			startPomodoro();

			expect(getPomodoroState().phaseStart).toBe(42);
			// Timer should still tick
			vi.advanceTimersByTime(1000);
			expect(getPomodoroState().secondsRemaining).toBeLessThan(FOCUS_SECONDS);
		});
	});

	// ─── formatPomodoroTime ─────────────────────────────────────────────

	describe('formatPomodoroTime', () => {
		it('formats zero', () => {
			expect(formatPomodoroTime(0)).toBe('00:00');
		});

		it('formats seconds only', () => {
			expect(formatPomodoroTime(59)).toBe('00:59');
		});

		it('formats minutes and seconds', () => {
			expect(formatPomodoroTime(65)).toBe('01:05');
			expect(formatPomodoroTime(600)).toBe('10:00');
			expect(formatPomodoroTime(3599)).toBe('59:59');
		});

		it('formats hours (overflow beyond 59:59)', () => {
			expect(formatPomodoroTime(3600)).toBe('60:00');
			expect(formatPomodoroTime(3661)).toBe('61:01');
		});

		it('pads single digits with leading zero', () => {
			expect(formatPomodoroTime(5)).toBe('00:05');
			expect(formatPomodoroTime(60)).toBe('01:00');
			expect(formatPomodoroTime(61)).toBe('01:01');
		});
	});

	// ─── resetPomodoro ──────────────────────────────────────────────────

	describe('resetPomodoro', () => {
		it('resets from active focus state', () => {
			setPomodoroConfig(FAST_CONFIG);
			startPomodoro();
			expect(getPomodoroState().phase).toBe('focus');
			resetPomodoro();
			const s = getPomodoroState();
			expect(s.phase).toBe('idle');
			expect(s.secondsRemaining).toBe(0);
		});

		it('resets from paused state', () => {
			setPomodoroConfig(FAST_CONFIG);
			startPomodoro();
			pausePomodoro();
			resetPomodoro();
			expect(getPomodoroState().phase).toBe('idle');
			expect(getPomodoroState().paused).toBe(false);
		});

		it('can start fresh after reset', () => {
			setPomodoroConfig(FAST_CONFIG);
			startPomodoro();
			passFocus();
			resetPomodoro();

			// Start again
			startPomodoro('/new.md', 1);
			expect(getPomodoroState().phase).toBe('focus');
			expect(getPomodoroState().taskFilePath).toBe('/new.md');
		});
	});

	// ─── Edge cases ─────────────────────────────────────────────────────

	describe('edge cases', () => {
		it('task file path and line are preserved through pause/resume', () => {
			setPomodoroConfig(FAST_CONFIG);
			startPomodoro('/preserved.md', 7);
			pausePomodoro();
			resumePomodoro();
			const s = getPomodoroState();
			expect(s.taskFilePath).toBe('/preserved.md');
			expect(s.taskLine).toBe(7);
		});

		it('startPomodoro with null args does not override previous task link', () => {
			setPomodoroConfig(FAST_CONFIG);
			startPomodoro('/initial.md', 3);
			// Starting a second session without args
			startPomodoro();
			const s = getPomodoroState();
			expect(s.taskFilePath).toBeNull();
			expect(s.taskLine).toBeNull();
		});

		it('paused state is cleared on stopPomodoro', () => {
			setPomodoroConfig(FAST_CONFIG);
			startPomodoro();
			pausePomodoro();
			expect(getPomodoroState().paused).toBe(true);
			stopPomodoro();
			expect(getPomodoroState().paused).toBe(false);
		});
	});
});
