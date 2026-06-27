/**
 * Pomodoro timer — focus sessions with short/long breaks.
 * Integrates with task timing: a pomodoro session can be linked to a task.
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

function notifyTick() { tickCallback?.(); }
function notifyPhaseEnd(phase: PomodoroPhase) { phaseEndCallback?.(phase, state); }

function startInterval() {
	stopInterval();
	intervalId = window.setInterval(() => {
		if (state.paused) return;
		state.secondsRemaining--;
		notifyTick();
		if (state.secondsRemaining <= 0) {
			stopInterval();
			const endedPhase = state.phase;
			advancePhase();
			notifyPhaseEnd(endedPhase);
			notifyTick();
		}
	}, 1000);
}

function stopInterval() {
	if (intervalId !== null) { clearInterval(intervalId); intervalId = null; }
}

export function setPomodoroConfig(c: Partial<PomodoroConfig>) {
	config = { ...config, ...c };
}

export function getPomodoroConfig(): PomodoroConfig {
	return { ...config };
}

export function setPomodoroCallbacks(tick: (() => void) | null, phaseEnd: ((phase: PomodoroPhase, st: PomodoroState) => void) | null) {
	tickCallback = tick;
	phaseEndCallback = phaseEnd;
}

export function getPomodoroState(): PomodoroState {
	return { ...state };
}

function advancePhase() {
	switch (state.phase) {
		case 'focus':
			state.completedCount++;
			if (state.completedCount % config.longBreakAfter === 0) {
				startPhase('longBreak');
			} else {
				startPhase('shortBreak');
			}
			break;
		case 'shortBreak':
		case 'longBreak':
			startPhase('focus');
			break;
		default:
			break;
	}
}

function startPhase(phase: PomodoroPhase) {
	const minutes = phase === 'focus' ? config.focusMinutes
		: phase === 'shortBreak' ? config.shortBreakMinutes
		: config.longBreakMinutes;

	const now = Date.now();
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

/** Start a focus pomodoro, optionally linked to a task */
export function startPomodoro(taskFilePath?: string | null, taskLine?: number | null) {
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
export function pausePomodoro() {
	if (state.paused || state.phase === 'idle') return;
	state.paused = true;
	stopInterval();
}

/** Resume the current pomodoro */
export function resumePomodoro() {
	if (!state.paused) return;
	state.paused = false;
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

/** Format seconds to MM:SS */
export function formatPomodoroTime(sec: number): string {
	const m = Math.floor(sec / 60);
	const s = sec % 60;
	return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
