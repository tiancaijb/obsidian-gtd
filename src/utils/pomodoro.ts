import { Notice, Plugin } from 'obsidian';
import { AgendaView, AGENDA_VIEW_TYPE } from '../views/agenda-view';
import { appendClockLog } from './file-ops';
import { Lang } from './i18n';

/**
 * Pomodoro timer — focus sessions with short/long breaks.
 * Integrates with task timing: a pomodoro session can be linked to a task.
 *
 * Time dependencies (Date.now, setInterval, clearInterval) are extracted
 * behind a provider interface so tests can inject fakes.
 * State is updated immutably — each mutation creates a new PomodoroState.
 */

export type PomodoroPhase = 'idle' | 'focus' | 'shortBreak' | 'longBreak';

export interface PomodoroConfig {
	focusMinutes: number;
	shortBreakMinutes: number;
	longBreakMinutes: number;
	longBreakAfter: number; // number of pomodoros before long break
}

export const DEFAULT_POMODORO_CONFIG: PomodoroConfig = {
	focusMinutes: 25,
	shortBreakMinutes: 5,
	longBreakMinutes: 15,
	longBreakAfter: 4,
};

export interface PomodoroState {
	phase: PomodoroPhase;
	phaseStart: number;
	secondsRemaining: number;
	completedCount: number;
	taskFilePath: string | null;
	taskLine: number | null;
	paused: boolean;
	pausedElapsedMs: number;
	/** Timestamp when the current focus phase started (for CLOCK logging) */
	focusStartTime: number;
}

// ---------------------------------------------------------------------------
// Time provider — injectable for testing
// ---------------------------------------------------------------------------

export interface PomodoroTimeProvider {
	now: () => number;
	setInterval: (fn: () => void, ms: number) => number;
	clearInterval: (id: number) => void;
}

const defaultTimeProvider: PomodoroTimeProvider = {
	now: () => Date.now(),
	setInterval: (fn, ms) => window.setInterval(fn, ms),
	clearInterval: (id) => { window.clearInterval(id); },
};

let timeProvider: PomodoroTimeProvider = defaultTimeProvider;

/**
 * Override the time provider (for testing).
 * Pass a partial — any omitted fields keep their current value.
 * Call `resetPomodoro()` to restore the default provider.
 */
export function setPomodoroTimeProvider(partial: Partial<PomodoroTimeProvider>): void {
	timeProvider = { ...timeProvider, ...partial };
}

// ---------------------------------------------------------------------------
// Mutable module-level state (single source of truth)
// ---------------------------------------------------------------------------

let state: PomodoroState = {
	phase: 'idle',
	phaseStart: 0,
	secondsRemaining: 0,
	completedCount: 0,
	taskFilePath: null,
	taskLine: null,
	paused: false,
	pausedElapsedMs: 0,
	focusStartTime: 0,
};

let config: PomodoroConfig = { ...DEFAULT_POMODORO_CONFIG };
let tickCallback: (() => void) | null = null;
let phaseEndCallback: ((phase: PomodoroPhase, state: PomodoroState) => void) | null = null;
let intervalId: number | null = null;
let registerIntervalFn: ((id: number) => void) | null = null;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function notifyTick(): void {
	tickCallback?.();
}

function notifyPhaseEnd(phase: PomodoroPhase): void {
	phaseEndCallback?.(phase, state);
}

function startInterval(): void {
	stopInterval();
	intervalId = timeProvider.setInterval(() => {
		if (state.paused) return;

		// Immutable state update — create new object instead of mutating
		state = { ...state, secondsRemaining: state.secondsRemaining - 1 };
		notifyTick();

		if (state.secondsRemaining <= 0) {
			stopInterval();
			const endedPhase = state.phase;
			advancePhase();
			notifyPhaseEnd(endedPhase);
			notifyTick();
		}
	}, 1000);
	registerIntervalFn?.(intervalId);
}

function stopInterval(): void {
	if (intervalId !== null) {
		timeProvider.clearInterval(intervalId);
		intervalId = null;
	}
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export function setPomodoroConfig(c: Partial<PomodoroConfig>): void {
	config = { ...config, ...c };
}

export function getPomodoroConfig(): PomodoroConfig {
	return { ...config };
}

// ---------------------------------------------------------------------------
// Callbacks (idempotent — repeated calls replace previous registration)
// ---------------------------------------------------------------------------

export function setPomodoroCallbacks(
	tick: (() => void) | null,
	phaseEnd: ((phase: PomodoroPhase, st: PomodoroState) => void) | null,
): void {
	tickCallback = tick;
	phaseEndCallback = phaseEnd;
}

/**
 * Set a function to register the interval ID with the plugin lifecycle.
 * When set, every new interval created by startInterval() will be passed
 * to this function (typically `plugin.registerInterval`), so it is
 * automatically cleaned up on plugin unload.
 */
export function setRegisterIntervalFn(fn: ((id: number) => void) | null): void {
	registerIntervalFn = fn;
}

// ---------------------------------------------------------------------------
// State queries
// ---------------------------------------------------------------------------

export function getPomodoroState(): PomodoroState {
	return { ...state };
}

// ---------------------------------------------------------------------------
// Phase transitions (immutable state updates)
// ---------------------------------------------------------------------------

function advancePhase(): void {
	switch (state.phase) {
		case 'focus': {
			const newCount = state.completedCount + 1;
			// Set completedCount before startPhase so it's preserved in the spread
			state = { ...state, completedCount: newCount };
			if (newCount % config.longBreakAfter === 0) {
				startPhase('longBreak');
			} else {
				startPhase('shortBreak');
			}
			break;
		}
		case 'shortBreak':
		case 'longBreak':
			startPhase('focus');
			break;
		default:
			break;
	}
}

function startPhase(phase: PomodoroPhase): void {
	const minutes =
		phase === 'focus' ? config.focusMinutes
		: phase === 'shortBreak' ? config.shortBreakMinutes
		: config.longBreakMinutes;

	const now = timeProvider.now();
	state = {
		...state,
		phase,
		phaseStart: now,
		secondsRemaining: minutes * 60,
		paused: false,
		pausedElapsedMs: 0,
		focusStartTime: phase === 'focus' ? now : state.focusStartTime,
	};

	if (phase !== 'idle') startInterval();
}

// ---------------------------------------------------------------------------
// Public API — start / pause / resume / stop
// ---------------------------------------------------------------------------

/** Start a focus pomodoro, optionally linked to a task */
export function startPomodoro(taskFilePath?: string | null, taskLine?: number | null): void {
	// Reset completed count for a new session
	state = {
		...state,
		completedCount: 0,
		taskFilePath: taskFilePath ?? null,
		taskLine: taskLine ?? null,
	};
	startPhase('focus');
}

/** Pause the current pomodoro */
export function pausePomodoro(): void {
	if (state.paused || state.phase === 'idle') return;
	stopInterval();
	state = { ...state, paused: true };
}

/** Resume the current pomodoro */
export function resumePomodoro(): void {
	if (!state.paused) return;
	state = { ...state, paused: false };
	startInterval();
}

/** Stop/cancel the pomodoro entirely */
export function stopPomodoro(): { elapsedSec: number; phase: PomodoroPhase } | null {
	if (state.phase === 'idle') return null;
	const elapsedSec = state.phase === 'focus'
		? (config.focusMinutes * 60) - state.secondsRemaining
		: 0;
	const endedPhase = state.phase;
	stopInterval();
	state = {
		phase: 'idle',
		phaseStart: 0,
		secondsRemaining: 0,
		completedCount: 0,
		taskFilePath: null,
		taskLine: null,
		paused: false,
		pausedElapsedMs: 0,
		focusStartTime: 0,
	};
	return { elapsedSec, phase: endedPhase };
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

/** Format seconds to MM:SS */
export function formatPomodoroTime(sec: number): string {
	const m = Math.floor(sec / 60);
	const s = sec % 60;
	return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ---------------------------------------------------------------------------
// Plugin lifecycle helpers
// ---------------------------------------------------------------------------

/**
 * Setup pomodoro lifecycle callbacks on a plugin instance.
 * Registers a tick callback (refreshes agenda view) and a phase-end callback
 * (shows notification + optionally writes CLOCK record after focus).
 */
export function setupPomodoroCallbacks(
	plugin: Plugin & { settings: { lang: Lang } },
): void {
	setPomodoroCallbacks(
		() => {
			const leaves =
				plugin.app.workspace.getLeavesOfType(AGENDA_VIEW_TYPE);
			const leaf = leaves[0];
			if (leaf?.view instanceof AgendaView) {
				leaf.view.refreshPomodoro();
			}
		},
		(phase: PomodoroPhase, ps: PomodoroState) => {
			const name =
				phase === 'focus'
					? 'Focus'
					: phase === 'shortBreak'
						? 'Break'
						: 'Long break';
			new Notice('Pomodoro ' + name + ' finished!');
			if (
				'Notification' in window &&
				Notification.permission === 'granted'
			) {
				new Notification('GTD Pomodoro', {
					body: `${name} finished!`,
				});
			}
			// Write CLOCK record when focus ends
			if (
				phase === 'focus' &&
				ps.taskFilePath !== null &&
				ps.taskLine !== null &&
				typeof ps.focusStartTime === 'number' &&
				ps.focusStartTime > 0
			) {
				const endDate = new Date();
				const startDate = new Date(ps.focusStartTime);
				void appendClockLog(
					plugin,
					ps.taskFilePath,
					ps.taskLine,
					startDate,
					endDate,
					plugin.settings.lang,
				);
			}
		},
	);
}

// ---------------------------------------------------------------------------
// Test support
// ---------------------------------------------------------------------------

/**
 * Reset all internal state — for testing use only.
 * Stops any running interval, clears callbacks, resets config and time provider.
 */
export function resetPomodoro(): void {
	stopInterval();
	state = {
		phase: 'idle',
		phaseStart: 0,
		secondsRemaining: 0,
		completedCount: 0,
		taskFilePath: null,
		taskLine: null,
		paused: false,
		pausedElapsedMs: 0,
		focusStartTime: 0,
	};
	config = { ...DEFAULT_POMODORO_CONFIG };
	tickCallback = null;
	phaseEndCallback = null;
	registerIntervalFn = null;
	timeProvider = defaultTimeProvider;
}
