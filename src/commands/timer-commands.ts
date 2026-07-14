import { MarkdownView, Notice } from 'obsidian';
import OrgGtdPlugin from '../main';
import { isTaskLine } from '../utils/parser';
import { t } from '../utils/i18n';
import {
	startTimer,
	stopTimer,
	getCurrentTimer,
	formatDuration,
} from '../utils/timer';
import { startPomodoro, stopPomodoro } from '../utils/pomodoro';
import { appendClockLog } from '../utils/file-ops';

/**
 * Toggle timer on a task: start if none running, stop+log if same task,
 * or switch to new task (logging the old one if long enough).
 *
 * Extracted from the original OrgGtdPlugin.toggleTimer() method.
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

/**
 * Register timer and pomodoro commands:
 *  - gtd-toggle-timer
 *  - gtd-pomodoro-start
 *  - gtd-pomodoro-stop
 */
export function registerTimerCommands(plugin: OrgGtdPlugin): void {
	plugin.addCommand({
		id: 'gtd-toggle-timer',
		name: 'Toggle timer on current task',
		callback: () => {
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
		},
	});

	plugin.addCommand({
		id: 'gtd-pomodoro-start',
		name: 'Start pomodoro (focus)',
		callback: () => {
			const view =
				plugin.app.workspace.getActiveViewOfType(MarkdownView);
			const file = view?.file;
			const cursor = view?.editor.getCursor();
			const line = cursor?.line;
			const text = line !== undefined ? view?.editor.getLine(line) : '';
			const isTask = text ? isTaskLine(text) : false;
			startPomodoro(isTask ? file?.path : null, isTask ? line : null);
			new Notice('🍅 Pomodoro started!');
		},
	});

	plugin.addCommand({
		id: 'gtd-pomodoro-stop',
		name: 'Stop pomodoro',
		callback: () => {
			const result = stopPomodoro();
			if (result) new Notice('🍅 Pomodoro stopped');
			else new Notice('No active pomodoro');
		},
	});
}
