/**
 * Task timer — one active timer at a time, like org-mode.
 */

export interface TimerState {
	filePath: string;
	line: number;
	startTime: number;      // Date.now() when this session started
	elapsedMs: number;      // previous sessions' elapsed
	running: boolean;
}

let currentTimer: TimerState | null = null;
let tickCallback: (() => void) | null = null;
let intervalId: number | null = null;

function notifyTick() { tickCallback?.(); }

function startInterval() {
	if (intervalId !== null) return;
	intervalId = window.setInterval(notifyTick, 5000); // every 5s is enough
}

function stopInterval() {
	if (intervalId !== null) { window.clearInterval(intervalId); intervalId = null; }
}

export function getCurrentTimer(): TimerState | null { return currentTimer; }
export function setTickCallback(cb: (() => void) | null) { tickCallback = cb; }

export function startTimer(filePath: string, line: number): TimerState {
	currentTimer = { filePath, line, startTime: Date.now(), elapsedMs: 0, running: true };
	startInterval();
	return currentTimer;
}

export function pauseTimer(): TimerState | null {
	if (!currentTimer?.running) return currentTimer;
	currentTimer.elapsedMs += Date.now() - currentTimer.startTime;
	currentTimer.running = false;
	stopInterval();
	return currentTimer;
}

export function resumeTimer(): TimerState | null {
	if (currentTimer?.running) return currentTimer;
	if (!currentTimer) return null;
	currentTimer.startTime = Date.now();
	currentTimer.running = true;
	startInterval();
	return currentTimer;
}

/** Stop and return elapsed info including start/end timestamps */
export function stopTimer(): {
	elapsedMs: number; startDate: Date; endDate: Date;
} | null {
	if (!currentTimer) return null;
	const endDate = new Date();
	const total = currentTimer.elapsedMs + (currentTimer.running ? endDate.getTime() - currentTimer.startTime : 0);
	const startDate = new Date(currentTimer.startTime);

	currentTimer = null;
	stopInterval();
	return { elapsedMs: total, startDate, endDate };
}

export function getElapsed(): number {
	if (!currentTimer) return 0;
	return currentTimer.elapsedMs + (currentTimer.running ? Date.now() - currentTimer.startTime : 0);
}

/** Format: "30m" or "1h 15m" (no seconds) */
export function formatDuration(ms: number): string {
	const totalMin = Math.floor(ms / 60000);
	if (totalMin === 0) return '<1m';
	const h = Math.floor(totalMin / 60);
	const m = totalMin % 60;
	if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
	return `${m}m`;
}

/** org-mode style date string: 2026-06-27 Sat 14:30 */
function fmtDateTime(d: Date): string {
	const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
	const y = d.getFullYear();
	const mo = String(d.getMonth() + 1).padStart(2, '0');
	const day = String(d.getDate()).padStart(2, '0');
	const h = String(d.getHours()).padStart(2, '0');
	const mi = String(d.getMinutes()).padStart(2, '0');
	return `${y}-${mo}-${day} ${days[d.getDay()]} ${h}:${mi}`;
}

/** org-mode style clock line, keyword follows language setting */
export function formatClockLine(start: Date, end: Date, keyword = 'CLOCK'): string {
	const durMs = end.getTime() - start.getTime();
	const totalMin = Math.floor(durMs / 60000);
	const h = Math.floor(totalMin / 60);
	const m = totalMin % 60;
	const durStr = `${h}:${String(m).padStart(2, '0')}`;
	return `  ${keyword}: [${fmtDateTime(start)}]--[${fmtDateTime(end)}] => ${durStr}`;
}
