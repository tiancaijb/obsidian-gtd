import { Editor, MarkdownView, Plugin, Notice } from 'obsidian';
import { parseTaskLines, parseTaskLine, serializeTask, isTaskLine, isMetaLine } from './utils/parser';
import { t, gtdFilenames } from './utils/i18n';
import { ParsedTask, Priority } from './models/task';
import { GtdPluginSettings, GtdSettingTab, DEFAULT_SETTINGS } from './settings';
import { gtdDecorationField } from './utils/editor-ext';
import { AgendaView, AGENDA_VIEW_TYPE, TimerAPI } from './views/agenda-view';
import { TimelineView, TIMELINE_VIEW_TYPE } from './views/timeline-view';
import { StatsView, STATS_VIEW_TYPE } from './views/stats-view';
import { CaptureModal } from './views/capture-modal';
import { DatePickerModal } from './views/date-picker-modal';
import { startTimer, pauseTimer, resumeTimer, stopTimer, getCurrentTimer, getElapsed as getTimerElapsed, formatDuration, setTickCallback } from './utils/timer';
import { setPomodoroConfig, setPomodoroCallbacks, startPomodoro, stopPomodoro, PomodoroPhase, PomodoroState, setRegisterIntervalFn as setPomodoroRegisterIntervalFn } from './utils/pomodoro';
import { computeNextDate, todayStr } from './utils/date-utils';
import { checkMorningReminder } from './utils/morning-reminder';
import { appendClockLog } from './utils/file-ops';
import { toggleAgendaView, activateAgendaView, openOrRevealView } from './utils/view-utils';

const PRIORITIES: (Priority | null)[] = ['A', 'B', 'C', null];

export default class OrgGtdPlugin extends Plugin {
	settings: GtdPluginSettings = { ...DEFAULT_SETTINGS };

	async onload() {
		await this.loadSettings();
	this.applyTheme();
		this.syncPomodoroConfig();

		this.addSettingTab(new GtdSettingTab(this.app, this));
		this.registerEditorExtension([gtdDecorationField]);

		// Register pomodoro interval for lifecycle-safe cleanup
		setPomodoroRegisterIntervalFn((id) => this.registerInterval(id));

		// Ensure GTD folder structure exists
		this.app.workspace.onLayoutReady(() => {
			void this.ensureGtdFolders();
			void checkMorningReminder(this);
		});

		// --- Commands ---

		this.addCommand({
			id: 'gtd-toggle-checkbox',
			name: 'Toggle task checkbox',
			callback: () => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!view) { new Notice('No active editor'); return; }
				this.modifyCurrentLine(view.editor, (task) => {
					task.checked = !task.checked;

					if (task.checked && task.repeat) {
						// Repeat from today (like org-mode <.SCHEDULED: <.>)
						const next = computeNextDate(todayStr(), task.repeat);
						if (next) task.scheduled = next;
						task.checked = false;
						task.closed = null;
					} else {
						task.closed = task.checked ? new Date().toISOString().slice(0, 10) : null;
					}

					return task;
				});
			},
		});

		this.addCommand({
			id: 'gtd-cycle-priority',
			name: 'Cycle priority up (A to B to C to none)',
			editorCallback: (editor: Editor) => {
				this.modifyCurrentLine(editor, (task) => {
					const idx = PRIORITIES.indexOf(task.priority);
					task.priority = PRIORITIES[(idx + 1) % PRIORITIES.length] ?? null;
					return task;
				});
			},
		});
		this.addCommand({
			id: 'gtd-cycle-priority-down',
			name: 'Cycle priority down (none to C to B to A)',
			editorCallback: (editor: Editor) => {
				this.modifyCurrentLine(editor, (task) => {
					const idx = PRIORITIES.indexOf(task.priority);
					task.priority = PRIORITIES[(idx - 1 + PRIORITIES.length) % PRIORITIES.length] ?? null;
					return task;
				});
			},
		});

		this.addCommand({
			id: 'gtd-set-scheduled',
			name: 'Set scheduled date',
			callback: async () => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!view) { new Notice('No active editor'); return; }
				const task = parseTaskLine(view.editor.getLine(view.editor.getCursor().line), 0);
				if (!task) { new Notice('Not a gtd task'); return; }

				const modal = new DatePickerModal(this.app, 'Set SCHEDULED', task.scheduled, this.settings.lang);
				modal.open();
				const result = await modal.waitForResult();
				if (!result) return;

				this.modifyCurrentLine(view.editor, (t) => {
					t.scheduled = result === 'remove' ? null : result;
					return t;
				});
			},
		});

		this.addCommand({
			id: 'gtd-set-deadline',
			name: 'Set deadline date',
			callback: async () => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!view) { new Notice('No active editor'); return; }
				const task = parseTaskLine(view.editor.getLine(view.editor.getCursor().line), 0);
				if (!task) { new Notice('Not a gtd task'); return; }

				const modal = new DatePickerModal(this.app, 'Set DEADLINE', task.deadline, this.settings.lang);
				modal.open();
				const result = await modal.waitForResult();
				if (!result) return;

				this.modifyCurrentLine(view.editor, (t) => {
					t.deadline = result === 'remove' ? null : result;
					return t;
				});
			},
		});

		// --- Promote / Demote (org-mode style) ---

		this.addCommand({
			id: 'gtd-promote',
			name: 'Promote task (reduce indent)',
			editorCallback: (editor: Editor) => { this.adjustIndent(editor, -2); },
		});

		this.addCommand({
			id: 'gtd-demote',
			name: 'Demote task (increase indent)',
			editorCallback: (editor: Editor) => { this.adjustIndent(editor, 2); },
		});

		// --- Insert task checkbox ---
		this.addCommand({
			id: 'gtd-insert-task',
			name: 'Insert task: - [ ]',
			editorCallback: (editor: Editor) => {
				editor.replaceSelection('- [ ] ');
			},
		});

		// --- Quick Capture (from anywhere) ---
		this.addCommand({
			id: 'gtd-quick-capture',
			name: 'Quick capture',
			callback: () => {
				new CaptureModal(this.app, this.settings.inboxPath, this.settings.lang).open();
			},
		});

		// Timer state-change callback: immediate UI update on start/pause/resume/stop
		setTickCallback(() => {
			const leaves = this.app.workspace.getLeavesOfType(AGENDA_VIEW_TYPE);
			const leaf = leaves[0];
			if (leaf?.view instanceof AgendaView) {
				leaf.view.refreshTimerOnly();
			}
		});

		// Periodic timer display refresh (caller manages interval lifecycle)
		this.registerInterval(window.setInterval(() => {
			if (getCurrentTimer()?.running) {
				const leaves = this.app.workspace.getLeavesOfType(AGENDA_VIEW_TYPE);
				const leaf = leaves[0];
				if (leaf?.view instanceof AgendaView) {
					leaf.view.refreshTimerOnly();
				}
			}
		}, 5000));

		// --- Timer commands ---
		this.addCommand({
			id: 'gtd-toggle-timer',
			name: 'Toggle timer on current task',
			callback: () => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!view) { new Notice('No active editor'); return; }
				const cursor = view.editor.getCursor();
				const text = view.editor.getLine(cursor.line);
				if (!isTaskLine(text)) { new Notice('Not a task'); return; }

				const file = view.file;
				if (!file) { new Notice('No file'); return; }

				this.toggleTimer(file.path, cursor.line);
			},
		});

		// --- Pomodoro setup ---
		setPomodoroCallbacks(
			() => {
				const leaves = this.app.workspace.getLeavesOfType(AGENDA_VIEW_TYPE);
				const leaf = leaves[0];
				if (leaf?.view instanceof AgendaView) {
					leaf.view.refreshPomodoro();
				}
			},
			(phase: PomodoroPhase, ps: PomodoroState) => {
				const name = phase === 'focus' ? 'Focus' : phase === 'shortBreak' ? 'Break' : 'Long break';
				new Notice('Pomodoro ' + name + ' finished!');
				if ('Notification' in window && Notification.permission === 'granted') {
					new Notification('GTD Pomodoro', { body: `${name} finished!` });
				}
				// Write CLOCK record when focus ends
				if (phase === 'focus' && ps.taskFilePath !== null && ps.taskLine !== null && typeof ps.focusStartTime === 'number' && ps.focusStartTime > 0) {
					const endDate = new Date();
					const startDate = new Date(ps.focusStartTime);
					void appendClockLog(this, ps.taskFilePath, ps.taskLine, startDate, endDate, this.settings.lang);
				}
			},
		);

		this.addCommand({
			id: 'gtd-pomodoro-start',
			name: 'Start pomodoro (focus)',
			callback: () => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				const file = view?.file;
				const cursor = view?.editor.getCursor();
				const line = cursor?.line;
				const text = line !== undefined ? view?.editor.getLine(line) : '';
				const isTask = text ? isTaskLine(text) : false;
				startPomodoro(isTask ? file?.path : null, isTask ? line : null);
				new Notice('🍅 Pomodoro started!');
			},
		});

		this.addCommand({
			id: 'gtd-pomodoro-stop',
			name: 'Stop pomodoro',
			callback: () => {
				const result = stopPomodoro();
				if (result) new Notice('🍅 Pomodoro stopped');
				else new Notice('No active pomodoro');
			},
		});

		// --- Agenda view (sidebar) ---
		const timerAPI: TimerAPI = {
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
					new Notice(`⏱ ${dur} — ${t('timerTooShort', this.settings.lang)}`);
					return;
				}
				void appendClockLog(this, path, line, result.startDate, result.endDate, this.settings.lang);
				new Notice(`⏱ ${dur}`);
			},
		};

		this.registerView(AGENDA_VIEW_TYPE, (leaf) => new AgendaView(leaf, this.settings, timerAPI));

		this.addRibbonIcon('list-checks', 'GTD', () => { toggleAgendaView(this.app.workspace); });

		this.addCommand({
			id: 'gtd-open-agenda',
			name: 'Open sidebar',
			callback: () => { toggleAgendaView(this.app.workspace); },
		});

		this.addCommand({
			id: 'gtd-refresh-agenda',
			name: 'Refresh sidebar',
			callback: () => {
				const leaves = this.app.workspace.getLeavesOfType(AGENDA_VIEW_TYPE);
				const leaf = leaves[0];
				if (leaf?.view instanceof AgendaView) {
					void leaf.view.refresh();
				}
			},
		});

		this.registerView(TIMELINE_VIEW_TYPE, (leaf) => new TimelineView(leaf, this.settings.lang));
		this.registerView(STATS_VIEW_TYPE, (leaf) => new StatsView(leaf, this.settings.lang));

		this.addCommand({
			id: 'gtd-stats',
			name: 'Open time statistics',
			callback: () => { openOrRevealView(this.app.workspace, STATS_VIEW_TYPE); },
		});

		this.addCommand({
			id: 'gtd-timeline',
			name: 'Open time timeline',
			callback: () => { openOrRevealView(this.app.workspace, TIMELINE_VIEW_TYPE); },
		});

		// Auto-open agenda only if not already open
		this.app.workspace.onLayoutReady(() => {
			const existing = this.app.workspace.getLeavesOfType(AGENDA_VIEW_TYPE);
			if (existing.length === 0) {
				void activateAgendaView(this.app.workspace);
			}
		});

		// First-run welcome (registered via registerInterval so it's cleaned up on unload)
		this.registerInterval(window.setTimeout(() => {
			if (this.settings.firstRun) {
				this.settings.firstRun = false;
				void this.saveSettings();
				new Notice('👋 GTD Workflow 已加载 — 查看设置中的「快速开始」了解如何使用');
			}
		}, 2000));

		new Notice('Gtd: loaded');

		// Test command: manually show welcome
		this.addCommand({
			id: 'gtd-welcome',
			name: 'Show welcome guide',
			callback: () => {
				new Notice('📋 查看设置 → GTD Workflow → 快速开始');
			},
		});
	}

	modifyCurrentLine(editor: Editor, modify: (t: ParsedTask) => ParsedTask) {
		const cursor = editor.getCursor();
		const lines = editor.getValue().split('\n');
		const task = parseTaskLines(lines, cursor.line);
		if (!task) { new Notice('Not a GTD task (need - [ ] format)'); return; }

		const serialized = serializeTask(modify(task), this.settings.lang);
		const serializedLines = serialized.split('\n');

		const replaceStart = cursor.line;
		const replaceEnd = replaceStart + task.metaLineCount;
		lines.splice(replaceStart, replaceEnd - replaceStart + 1, ...serializedLines);
		editor.setValue(lines.join('\n'));

		const newLine = Math.min(replaceStart, lines.length - 1);
		editor.setCursor({ line: newLine, ch: cursor.ch });
	}

	adjustIndent(editor: Editor, delta: number) {
		const cursor = editor.getCursor();
		const lines = editor.getValue().split('\n');
		const lineText = lines[cursor.line];
		if (!lineText) return;

		if (!isTaskLine(lineText)) {
			new Notice('Not a task line');
			return;
		}

		// Current indent
		const match = lineText.match(/^(\s*)/);
		const currentIndent = match?.[1]?.length ?? 0;
		const newIndent = Math.max(0, currentIndent + delta);
		if (newIndent === currentIndent) return;

		// Find the block: this task + its meta lines + any subtasks with MORE indent
		const baseIndent = currentIndent;
		let blockEnd = cursor.line;

		for (let i = cursor.line + 1; i < lines.length; i++) {
			const l = lines[i];
			if (l === undefined) break;
			if (isTaskLine(l)) {
				const indent = l.match(/^(\s*)/)?.[1]?.length ?? 0;
				if (indent <= baseIndent) break; // peer or parent — stop
			} else if (!isMetaLine(l)) {
				break; // non-task, non-meta — stop
			}
			blockEnd = i;
		}

		// Adjust indent for all lines in the block
		const indentDiff = newIndent - currentIndent;
		for (let i = cursor.line; i <= blockEnd; i++) {
			const l = lines[i];
			if (l === undefined) continue;
			const leading = l.match(/^(\s*)/)?.[1] ?? '';
			lines[i] = l.slice(leading.length);
			const newLeading = leading.length + indentDiff >= 0
				? ' '.repeat(leading.length + indentDiff)
				: '';
			lines[i] = newLeading + (lines[i] ?? '');
		}

		editor.setValue(lines.join('\n'));
		// Keep cursor position (shift with indent change)
		const newCh = Math.max(0, cursor.ch + indentDiff);
		editor.setCursor({ line: cursor.line, ch: newCh });
		new Notice(t(delta < 0 ? 'promoted' : 'demoted', this.settings.lang));
	}

	private async ensureGtdFolders() {
		const base = this.settings.gtdFolder;

		// Ensure base folder exists
		try {
			if (!(await this.app.vault.adapter.exists(base))) {
				await this.app.vault.createFolder(base);
			}
		} catch (e) {
			console.warn('Failed to create GTD base folder:', e);
		}

		// Create GTD files with combined English-Chinese names
		for (const fname of Object.values(gtdFilenames)) {
			const filePath = `${base}/${fname}.md`;
			try {
				if (!(await this.app.vault.adapter.exists(filePath))) {
					await this.app.vault.create(filePath, '\n');
				}
			} catch (e) {
				console.warn(`Failed to create GTD file "${filePath}":`, e);
			}
		}

		this.settings.inboxPath = `${base}/${gtdFilenames.inbox}.md`;
	}

	toggleTimer(filePath: string, line: number) {
		const current = getCurrentTimer();
		if (!current) {
			startTimer(filePath, line);
			new Notice(t('timerStarted', this.settings.lang));
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
			void appendClockLog(this, filePath, line, result.startDate, result.endDate, this.settings.lang);
			new Notice(`⏱ ${dur}`);
			return;
		}

		// Different task: stop old (and log it if long enough), start new
		const oldResult = stopTimer();
		if (oldResult && oldResult.elapsedMs >= 60000) {
			void appendClockLog(this, current.filePath, current.line, oldResult.startDate, oldResult.endDate, this.settings.lang);
		}
		startTimer(filePath, line);
		new Notice(t('timerStarted', this.settings.lang));
	}

	onunload() {
		// Clear callbacks to prevent stale references after plugin unload
		setTickCallback(null);
		setPomodoroCallbacks(null, null);
		setPomodoroRegisterIntervalFn(null);
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData()) as GtdPluginSettings;
	}

	/** Switch the body-level theme class for GTD */
	applyTheme() {
		activeDocument.body.classList.remove('gtd-theme-basic', 'gtd-theme-premium-dark');
		activeDocument.body.classList.add('gtd-theme-' + this.settings.theme);
	}

	private syncPomodoroConfig() {
		setPomodoroConfig({
			focusMinutes: this.settings.pomodoroFocus,
			shortBreakMinutes: this.settings.pomodoroShortBreak,
			longBreakMinutes: this.settings.pomodoroLongBreak,
			longBreakAfter: this.settings.pomodoroLongBreakAfter,
		});
	}

	async saveSettings() {
		await this.saveData(this.settings);
		this.syncPomodoroConfig();
		this.applyTheme();
		const leaves = this.app.workspace.getLeavesOfType(AGENDA_VIEW_TYPE);
		for (const leaf of leaves) {
			if (leaf.view instanceof AgendaView) {
				leaf.view.updateSettings(this.settings);
			}
		}
		const tlLeaves = this.app.workspace.getLeavesOfType(TIMELINE_VIEW_TYPE);
		for (const leaf of tlLeaves) {
			if (leaf.view instanceof TimelineView) {
				leaf.view.updateSettings(this.settings.lang);
			}
		}
		const stLeaves = this.app.workspace.getLeavesOfType(STATS_VIEW_TYPE);
		for (const leaf of stLeaves) {
			if (leaf.view instanceof StatsView) {
				leaf.view.updateSettings(this.settings.lang);
			}
		}
	}
}
