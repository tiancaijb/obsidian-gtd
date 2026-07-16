import { MarkdownView, Notice } from 'obsidian';
import OrgGtdPlugin from '../main';
import { isTaskLine } from '../utils/parser';
import { t } from '../utils/i18n';
import {
	startTimer,
	pauseTimer,
	resumeTimer,
	stopTimer,
	getCurrentTimer,
	getElapsed as getTimerElapsed,
	formatDuration,
} from '../utils/timer';
import { startPomodoro, stopPomodoro } from '../utils/pomodoro';
import { appendClockLog } from '../utils/file-ops';
import { TimerAPI } from '../views/agenda-view';

/**
 * Toggle timer on a task: start if none running, stop+log if same task,
 * or switch to new task (logging the old one if long enough).
 */
function toggleTimer(
	plugin: OrgGtdPlugin,
	filePath: string,
	line: number,
): void {
	const current = getCurrentTimer();
	if (!current) {
		startTimer(filePath, line);
		new Notice(t('timerStarted', plugin.settings.lang));
		return;
	}

	// Same task: stop and maybe log
	if (current.filePath === filePath && current.line === line) {
		const result = stopTimer();
		if (!result) return;
		const dur = formatDuration(result.elapsedMs);
		if (result.elapsedMs < 60000) {
			new Notice(`⏱ ${dur} — too short, not recorded`);
			return;
		}
		void appendClockLog(
			plugin,
			filePath,
			line,
			result.startDate,
			result.endDate,
			plugin.settings.lang,
		);
		new Notice(`⏱ ${dur}`);
		return;
	}

	// Different task: stop old (and log it if long enough), start new
	const oldResult = stopTimer();
	if (oldResult && oldResult.elapsedMs >= 60000) {
		void appendClockLog(
			plugin,
			current.filePath,
			current.line,
			oldResult.startDate,
			oldResult.endDate,
			plugin.settings.lang,
		);
	}
	startTimer(filePath, line);
	new Notice(t('timerStarted', plugin.settings.lang));
}

// ── Lazy callback implementations ───────────────────────────────────────

function toggleTimerOnCurrentTask(plugin: OrgGtdPlugin): void {
	const view =
		plugin.app.workspace.getActiveViewOfType(MarkdownView);
	if (!view) {
		new Notice('No active editor');
		return;
	}
	const cursor = view.editor.getCursor();
	const text = view.editor.getLine(cursor.line);
	if (!isTaskLine(text)) {
		new Notice('Not a task');
		return;
	}

	const file = view.file;
	if (!file) {
		new Notice('No file');
		return;
	}

	toggleTimer(plugin, file.path, cursor.line);
}

function startPomodoroFocus(plugin: OrgGtdPlugin): void {
	const view =
		plugin.app.workspace.getActiveViewOfType(MarkdownView);
	const file = view?.file;
	const cursor = view?.editor.getCursor();
	const line = cursor?.line;
	const text = line !== undefined ? view?.editor.getLine(line) : '';
	const isTask = text ? isTaskLine(text) : false;
	startPomodoro(isTask ? file?.path : null, isTask ? line : null);
	new Notice('🍅 Pomodoro started!');
}

function stopPomodoroFocus(): void {
	const result = stopPomodoro();
	if (result) new Notice('🍅 Pomodoro stopped');
	else new Notice('No active pomodoro');
}

// ── TimerAPI factory ────────────────────────────────────────────────────

/**
 * Create the TimerAPI object used by AgendaView to control the timer.
 */
export function createTimerAPI(plugin: OrgGtdPlugin): TimerAPI {
	const lang = () => plugin.settings.lang;
	return {
		start: (path: string, line: number) => startTimer(path, line),
		pause: () => pauseTimer(),
		resume: () => resumeTimer(),
		stop: () => stopTimer(),
		getCurrent: () => getCurrentTimer(),
		getElapsed: () => getTimerElapsed(),
		stopAndLog: (path: string, line: number) => {
			const result = stopTimer();
			if (!result) return;
			const dur = formatDuration(result.elapsedMs);
			if (result.elapsedMs < 60000) {
				new Notice(
					`\u23f1 ${dur} \u2014 ${t('timerTooShort', lang())}`,
				);
				return;
			}
			void appendClockLog(
				plugin,
				path,
				line,
				result.startDate,
				result.endDate,
				lang(),
			);
			new Notice(`\u23f1 ${dur}`);
		},
	};
}

/**
 * Register timer and pomodoro commands:
 *  - gtd-toggle-timer
 *  - gtd-pomodoro-start
 *  - gtd-pomodoro-stop
 *
 * Each callback is a standalone function for lazy execution.
 */
export function registerTimerCommands(plugin: OrgGtdPlugin): void {
	plugin.addCommand({
		id: 'gtd-toggle-timer',
		name: 'Toggle timer on current task',
		callback: () => { toggleTimerOnCurrentTask(plugin); },
	});

	plugin.addCommand({
		id: 'gtd-pomodoro-start',
		name: 'Start pomodoro (focus)',
		callback: () => { startPomodoroFocus(plugin); },
	});

	plugin.addCommand({
		id: 'gtd-pomodoro-stop',
		name: 'Stop pomodoro',
		callback: () => { stopPomodoroFocus(); },
	});
}
