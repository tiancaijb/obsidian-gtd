import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
	resetTimer,
	startTimer,
	pauseTimer,
	resumeTimer,
	stopTimer,
	getCurrentTimer,
	getElapsed,
	formatDuration,
	formatClockLine,
	setTickCallback,
} from '../../utils/timer';

// ─── Timer lifecycle ──────────────────────────────────────────────────────

describe('timer lifecycle', () => {
	beforeEach(() => {
		resetTimer();
		vi.useFakeTimers();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it('startTimer creates a running timer with all fields set', () => {
		const t = startTimer('/test.md', 3);
		expect(t.filePath).toBe('/test.md');
		expect(t.line).toBe(3);
		expect(t.running).toBe(true);
		expect(t.elapsedMs).toBe(0);
		// startTime should be set to the current fake time
		expect(t.startTime).toBeGreaterThan(0);
	});

	it('getCurrentTimer returns the active timer', () => {
		startTimer('/test.md', 0);
		expect(getCurrentTimer()).not.toBeNull();
		expect(getCurrentTimer()!.filePath).toBe('/test.md');
	});

	it('getCurrentTimer returns null when no timer active', () => {
		expect(getCurrentTimer()).toBeNull();
	});

	it('pauseTimer stops elapsed from increasing', () => {
		startTimer('/test.md', 0);
		vi.advanceTimersByTime(5000);
		const p = pauseTimer();
		expect(p).not.toBeNull();
		expect(p!.running).toBe(false);
		expect(p!.elapsedMs).toBeGreaterThanOrEqual(5000);
		expect(p!.elapsedMs).toBeLessThan(6000);

		// Time advances but elapsed should not increase while paused
		vi.advanceTimersByTime(10000);
		const afterSleep = getCurrentTimer();
		// elapsedMs stays the same (it was snapshotted at pause time)
		expect(afterSleep!.elapsedMs).toBe(p!.elapsedMs);
	});

	it('pauseTimer returns null when no timer is active', () => {
		expect(pauseTimer()).toBeNull();
	});

	it('pauseTimer returns current timer when already paused', () => {
		startTimer('/test.md', 0);
		pauseTimer();
		// Pausing an already-paused timer should return it unchanged
		const result = pauseTimer();
		expect(result).not.toBeNull();
		expect(result!.running).toBe(false);
	});

	it('resumeTimer continues counting after a pause', () => {
		startTimer('/test.md', 0);
		vi.advanceTimersByTime(3000);
		pauseTimer();
		const pausedElapsed = getElapsed();
		expect(pausedElapsed).toBeGreaterThanOrEqual(3000);
		expect(pausedElapsed).toBeLessThan(4000);

		// Advance while paused — elapsed should not change
		vi.advanceTimersByTime(5000);
		expect(getElapsed()).toBe(pausedElapsed);

		resumeTimer();
		vi.advanceTimersByTime(2000);
		expect(getElapsed()).toBeGreaterThanOrEqual(pausedElapsed + 2000);
		expect(getElapsed()).toBeLessThan(pausedElapsed + 3000);
	});

	it('resumeTimer returns null when no timer is active', () => {
		expect(resumeTimer()).toBeNull();
	});

	it('resumeTimer returns the timer when already running', () => {
		startTimer('/test.md', 0);
		const result = resumeTimer();
		expect(result).not.toBeNull();
		expect(result!.running).toBe(true);
	});

	it('stopTimer returns elapsed info with start/end dates', () => {
		startTimer('/test.md', 0);
		vi.advanceTimersByTime(10000);
		const r = stopTimer();
		expect(r).not.toBeNull();
		expect(r!.elapsedMs).toBeGreaterThanOrEqual(10000);
		expect(r!.elapsedMs).toBeLessThan(11000);

		// startDate should be a valid Date
		expect(r!.startDate).toBeInstanceOf(Date);
		expect(isNaN(r!.startDate.getTime())).toBe(false);
		// endDate should be a valid Date
		expect(r!.endDate).toBeInstanceOf(Date);
		expect(isNaN(r!.endDate.getTime())).toBe(false);
		// endDate should be after startDate
		expect(r!.endDate.getTime()).toBeGreaterThanOrEqual(r!.startDate.getTime());
		// The difference should approximately match elapsedMs
		expect(r!.endDate.getTime() - r!.startDate.getTime()).toBeGreaterThanOrEqual(10000);

		// Timer should be cleared
		expect(getCurrentTimer()).toBeNull();
	});

	it('stopTimer returns null when no timer is active', () => {
		expect(stopTimer()).toBeNull();
	});

	it('supports repeated start/stop cycles on the same task', () => {
		// First cycle
		startTimer('/test.md', 0);
		vi.advanceTimersByTime(5000);
		const r1 = stopTimer();
		expect(r1).not.toBeNull();
		expect(r1!.elapsedMs).toBeGreaterThanOrEqual(5000);
		expect(getCurrentTimer()).toBeNull();

		// Second cycle on the same file/line
		startTimer('/test.md', 0);
		vi.advanceTimersByTime(3000);
		const r2 = stopTimer();
		expect(r2).not.toBeNull();
		expect(r2!.elapsedMs).toBeGreaterThanOrEqual(3000);
		// This is a fresh timer, not cumulative
		expect(r2!.elapsedMs).toBeLessThan(6000);
	});

	it('startTimer overwrites an existing running timer', () => {
		startTimer('/first.md', 0);
		vi.advanceTimersByTime(5000);

		// Start a new timer on a different file — should overwrite
		const t2 = startTimer('/second.md', 1);
		expect(t2.filePath).toBe('/second.md');
		expect(t2.line).toBe(1);
		expect(t2.elapsedMs).toBe(0); // fresh state
		expect(getCurrentTimer()!.filePath).toBe('/second.md');

		// Stop should only capture the second timer's elapsed
		vi.advanceTimersByTime(2000);
		const r = stopTimer();
		expect(r!.elapsedMs).toBeGreaterThanOrEqual(2000);
		expect(r!.elapsedMs).toBeLessThan(3000);
	});

	it('getElapsed returns 0 when no timer is active', () => {
		expect(getElapsed()).toBe(0);
	});

	it('getElapsed increases while timer is running', () => {
		startTimer('/test.md', 0);
		expect(getElapsed()).toBe(0); // immediately after start

		vi.advanceTimersByTime(1000);
		expect(getElapsed()).toBeGreaterThanOrEqual(1000);
		expect(getElapsed()).toBeLessThan(2000);

		vi.advanceTimersByTime(4000);
		expect(getElapsed()).toBeGreaterThanOrEqual(5000);
		expect(getElapsed()).toBeLessThan(6000);
	});

	it('getElapsed stays constant while timer is paused', () => {
		startTimer('/test.md', 0);
		vi.advanceTimersByTime(5000);
		pauseTimer();

		const elapsedAtPause = getElapsed();
		expect(elapsedAtPause).toBeGreaterThanOrEqual(5000);

		// Time should not accumulate while paused
		vi.advanceTimersByTime(10000);
		expect(getElapsed()).toBe(elapsedAtPause);
	});

	it('calls tickCallback on all state changes', () => {
		const cb = vi.fn();
		setTickCallback(cb);

		startTimer('/t', 0);
		expect(cb).toHaveBeenCalledTimes(1);

		pauseTimer();
		expect(cb).toHaveBeenCalledTimes(2);

		resumeTimer();
		expect(cb).toHaveBeenCalledTimes(3);

		stopTimer();
		expect(cb).toHaveBeenCalledTimes(4);
	});

	it('no error when tickCallback is null on state changes', () => {
		setTickCallback(null);

		// None of these should throw
		expect(() => {
			startTimer('/t', 0);
			pauseTimer();
			resumeTimer();
			stopTimer();
		}).not.toThrow();
	});

	it('calls tickCallback only once per state change (not per interval tick)', () => {
		const cb = vi.fn();
		setTickCallback(cb);

		startTimer('/t', 0);
		vi.advanceTimersByTime(10000);
		expect(cb).toHaveBeenCalledTimes(1); // only the startTimer call

		pauseTimer();
		expect(cb).toHaveBeenCalledTimes(2);
	});

	it('resetTimer clears the current timer and callback', () => {
		startTimer('/test.md', 0);
		expect(getCurrentTimer()).not.toBeNull();

		resetTimer();
		expect(getCurrentTimer()).toBeNull();

		// Should be able to start again after reset
		const t = startTimer('/after-reset.md', 0);
		expect(t.filePath).toBe('/after-reset.md');
	});
});

// ─── formatDuration ───────────────────────────────────────────────────────

describe('formatDuration', () => {
	it('returns <1m for durations under 1 minute', () => {
		expect(formatDuration(0)).toBe('<1m');
		expect(formatDuration(1)).toBe('<1m');
		expect(formatDuration(59999)).toBe('<1m');
	});

	it('formats exact minutes', () => {
		expect(formatDuration(60000)).toBe('1m');
		expect(formatDuration(300000)).toBe('5m');
		expect(formatDuration(3540000)).toBe('59m');
	});

	it('formats exact hours', () => {
		expect(formatDuration(3600000)).toBe('1h');
		expect(formatDuration(7200000)).toBe('2h');
		expect(formatDuration(3600000 * 24)).toBe('24h');
	});

	it('formats hours and minutes', () => {
		expect(formatDuration(5400000)).toBe('1h 30m');
		expect(formatDuration(3660000)).toBe('1h 1m');
		expect(formatDuration(3600000 + 60000)).toBe('1h 1m');
		expect(formatDuration(7200000 + 300000)).toBe('2h 5m');
		expect(formatDuration(3600000 * 99 + 60000 * 59)).toBe('99h 59m');
	});
});

// ─── formatClockLine ──────────────────────────────────────────────────────

describe('formatClockLine', () => {
	it('produces a standard CLOCK line with correct format', () => {
		const s = new Date(2026, 5, 27, 10, 0);
		const e = new Date(2026, 5, 27, 10, 25);
		const line = formatClockLine(s, e);
		expect(line).toMatch(/^  CLOCK:/);
		expect(line).toMatch(/\[2026-06-27 Sat 10:00\]/);
		expect(line).toMatch(/\[2026-06-27 Sat 10:25\]/);
		expect(line).toMatch(/=> 0:25/);
	});

	it('uses a custom keyword', () => {
		const s = new Date(2026, 5, 27, 10, 0);
		const e = new Date(2026, 5, 27, 10, 25);
		const line = formatClockLine(s, e, '计时');
		expect(line).toMatch(/^  计时:/);
	});

	it('formats multi-hour durations', () => {
		const s = new Date(2026, 5, 27, 10, 0);
		const e = new Date(2026, 5, 27, 13, 30);
		const line = formatClockLine(s, e);
		expect(line).toMatch(/=> 3:30/);
	});

	it('handles zero-duration intervals', () => {
		const s = new Date(2026, 5, 27, 10, 0);
		const e = new Date(2026, 5, 27, 10, 0);
		const line = formatClockLine(s, e);
		expect(line).toMatch(/=> 0:00/);
	});

	it('handles single-digit minutes', () => {
		const s = new Date(2026, 5, 27, 10, 0);
		const e = new Date(2026, 5, 27, 10, 5);
		const line = formatClockLine(s, e);
		expect(line).toMatch(/=> 0:05/);
	});

	it('handles duration with only hours (no minutes)', () => {
		const s = new Date(2026, 5, 27, 10, 0);
		const e = new Date(2026, 5, 27, 15, 0);
		const line = formatClockLine(s, e);
		expect(line).toMatch(/=> 5:00/);
	});

	it('handles date boundary crossing (midnight)', () => {
		const s = new Date(2026, 5, 27, 23, 30);
		const e = new Date(2026, 5, 28, 0, 15);
		const line = formatClockLine(s, e);
		expect(line).toMatch(/=> 0:45/);
	});
});
