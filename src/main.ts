import { Editor, MarkdownView, MarkdownFileInfo, Plugin, Notice } from 'obsidian';
import { parseTaskLine, parseTaskLines, serializeTask, isTaskLine, isMetaLine } from './utils/parser';
import { t, metaKeywords, gtdFilenames } from './utils/i18n';
import { ParsedTask, Priority } from './models/task';
import { GtdPluginSettings, GtdSettingTab, DEFAULT_SETTINGS } from './settings';
import { gtdDecorationField } from './utils/editor-ext';
import { AgendaView, AGENDA_VIEW_TYPE, TimerAPI } from './views/agenda-view';
import { TimelineView, TIMELINE_VIEW_TYPE } from './views/timeline-view';
import { StatsView, STATS_VIEW_TYPE } from './views/stats-view';
import { CaptureModal } from './views/capture-modal';
import { DatePickerModal } from './views/date-picker-modal';
import { startTimer, pauseTimer, resumeTimer, stopTimer, getCurrentTimer, formatDuration, formatClockLine, setTickCallback } from './utils/timer';
import { setPomodoroConfig, setPomodoroCallbacks, getPomodoroState, startPomodoro, pausePomodoro, resumePomodoro, stopPomodoro, formatPomodoroTime, PomodoroPhase } from './utils/pomodoro';

const PRIORITIES: (Priority | null)[] = ['A', 'B', 'C', null];

export default class OrgGtdPlugin extends Plugin {
	settings!: GtdPluginSettings;

	async onload() {
		await this.loadSettings();
	this.applyTheme();
		this.syncPomodoroConfig();

		this.addSettingTab(new GtdSettingTab(this.app, this));
		this.registerEditorExtension([gtdDecorationField]);

		// Ensure GTD folder structure exists
		this.app.workspace.onLayoutReady(() => {
			this.ensureGtdFolders();
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
					task.closed = task.checked ? new Date().toISOString().slice(0, 10) : null;
					return task;
				});
			},
		});

		this.addCommand({
			id: 'gtd-cycle-priority',
			name: 'Priority ↑ (A → B → C → none)',
			hotkeys: [{ modifiers: ['Shift'], key: 'ArrowUp' }],
			editorCallback: (editor: Editor) => {
				this.modifyCurrentLine(editor, (task) => {
					const idx = PRIORITIES.indexOf(task.priority);
					task.priority = PRIORITIES[(idx + 1) % PRIORITIES.length]!;
					return task;
				});
			},
		});
		this.addCommand({
			id: 'gtd-cycle-priority-down',
			name: 'Priority ↓ (none → C → B → A)',
			hotkeys: [{ modifiers: ['Shift'], key: 'ArrowDown' }],
			editorCallback: (editor: Editor) => {
				this.modifyCurrentLine(editor, (task) => {
					const idx = PRIORITIES.indexOf(task.priority);
					task.priority = PRIORITIES[(idx - 1 + PRIORITIES.length) % PRIORITIES.length]!;
					return task;
				});
			},
		});

		this.addCommand({
			id: 'gtd-set-scheduled',
			name: 'Set SCHEDULED date',
			callback: async () => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!view) { new Notice('No active editor'); return; }
				const task = parseTaskLine(view.editor.getLine(view.editor.getCursor().line), 0);
				if (!task) { new Notice('Not a GTD task'); return; }

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
			name: 'Set DEADLINE date',
			callback: async () => {
				const view = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!view) { new Notice('No active editor'); return; }
				const task = parseTaskLine(view.editor.getLine(view.editor.getCursor().line), 0);
				if (!task) { new Notice('Not a GTD task'); return; }

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
			hotkeys: [{ modifiers: ['Alt'], key: 'ArrowLeft' }],
			editorCallback: (editor: Editor) => this.adjustIndent(editor, -2),
		});

		this.addCommand({
			id: 'gtd-demote',
			name: 'Demote task (increase indent)',
			hotkeys: [{ modifiers: ['Alt'], key: 'ArrowRight' }],
			editorCallback: (editor: Editor) => this.adjustIndent(editor, 2),
		});

		// --- Insert task checkbox ---
		this.addCommand({
			id: 'gtd-insert-task',
			name: 'Insert task: - [ ]',
			hotkeys: [{ modifiers: ['Mod', 'Shift'], key: 'Enter' }],
			editorCallback: (editor: Editor) => {
				editor.replaceSelection('- [ ] ');
			},
		});

		// --- Quick Capture (from anywhere) ---
		this.addCommand({
			id: 'gtd-quick-capture',
			name: 'Quick Capture',
			hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 'C' }],
			callback: () => {
				new CaptureModal(this.app, this.settings.inboxPath, this.settings.lang).open();
			},
		});

		// Timer tick: refresh agenda to show elapsed time
		setTickCallback(() => {
			const leaves = this.app.workspace.getLeavesOfType(AGENDA_VIEW_TYPE);
			if (leaves.length > 0) {
				(leaves[0]!.view as unknown as AgendaView).refreshTimerOnly();
			}
		});

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
				if (leaves.length > 0) {
					(leaves[0]!.view as unknown as AgendaView).refreshPomodoro();
				}
			},
			(phase: PomodoroPhase, st: any) => {
				const name = phase === 'focus' ? 'Focus' : phase === 'shortBreak' ? 'Break' : 'Long break';
				new Notice(`🍅 ${name} finished!`);
				if ('Notification' in window && Notification.permission === 'granted') {
					new Notification('GTD Pomodoro', { body: `${name} finished!` });
				}
				// Write CLOCK record when focus ends
				if (phase === 'focus' && st.taskFilePath && st.taskLine !== null && st.focusStartTime > 0) {
					const endDate = new Date();
					const startDate = new Date(st.focusStartTime);
					this.appendClockLog(st.taskFilePath, st.taskLine, startDate, endDate);
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
			getElapsed: () => { const t = getCurrentTimer(); return t ? t.elapsedMs + (t.running ? Date.now() - t.startTime : 0) : 0; },
			stopAndLog: (path: string, line: number) => {
				const result = stopTimer();
				if (!result) return;
				const dur = formatDuration(result.elapsedMs);
				if (result.elapsedMs < 60000) {
					new Notice(`⏱ ${dur} — ${t('timerTooShort', this.settings.lang)}`);
					return;
				}
				this.appendClockLog(path, line, result.startDate, result.endDate);
				new Notice(`⏱ ${dur}`);
			},
		};

		this.registerView(AGENDA_VIEW_TYPE, (leaf) => new AgendaView(leaf, this.settings, timerAPI));

		this.addRibbonIcon('list-checks', 'GTD', () => this.toggleAgendaView());

		this.addCommand({
			id: 'gtd-open-agenda',
			name: 'Open GTD sidebar',
			hotkeys: [{ modifiers: ['Ctrl', 'Shift'], key: 'G' }],
			callback: () => this.toggleAgendaView(),
		});

		this.addCommand({
			id: 'gtd-refresh-agenda',
			name: 'Refresh GTD sidebar',
			callback: async () => {
				const leaves = this.app.workspace.getLeavesOfType(AGENDA_VIEW_TYPE);
				if (leaves.length > 0) {
					(leaves[0]!.view as unknown as AgendaView).refresh();
				}
			},
		});

		this.registerView(TIMELINE_VIEW_TYPE, (leaf) => new TimelineView(leaf, this.settings.lang));
		this.registerView(STATS_VIEW_TYPE, (leaf) => new StatsView(leaf, this.settings.lang));

		this.addCommand({
			id: 'gtd-stats',
			name: 'Open time statistics',
			callback: () => {
				const existing = this.app.workspace.getLeavesOfType(STATS_VIEW_TYPE);
				if (existing.length === 0) {
					const leaf = this.app.workspace.getRightLeaf(false);
					if (leaf) {
						leaf.setViewState({ type: STATS_VIEW_TYPE });
						this.app.workspace.revealLeaf(leaf);
					}
				} else {
					this.app.workspace.revealLeaf(existing[0]!);
				}
			},
		});

		this.addCommand({
			id: 'gtd-timeline',
			name: 'Open time timeline',
			callback: () => {
				const existing = this.app.workspace.getLeavesOfType(TIMELINE_VIEW_TYPE);
				if (existing.length === 0) {
					const leaf = this.app.workspace.getRightLeaf(false);
					if (leaf) {
						leaf.setViewState({ type: TIMELINE_VIEW_TYPE });
						this.app.workspace.revealLeaf(leaf);
					}
				} else {
					this.app.workspace.revealLeaf(existing[0]!);
				}
			},
		});

		// Auto-open agenda only if not already open
		this.app.workspace.onLayoutReady(() => {
			const existing = this.app.workspace.getLeavesOfType(AGENDA_VIEW_TYPE);
			if (existing.length === 0) {
				this.activateAgendaView();
			}
		});

		// Poll for plugin file changes (WSL2 workaround)
		let lastMtime = 0;
		const pluginDir = ((this.app as any).plugins?.manifests['obsidian-gtd'] as any)?.dir;
		if (pluginDir) {
			this.registerInterval(window.setInterval(async () => {
				if (!this.app) return;
				try {
					const stat = await this.app.vault.adapter.stat(`${pluginDir}/main.js`);
					if (stat && stat.mtime) {
						if (lastMtime > 0 && stat.mtime !== lastMtime) {
							new Notice('🔄 GTD updated — run Hot Reload: Check changes');
						}
						lastMtime = stat.mtime;
					}
				} catch (_) {}
			}, 3000));
		}

		new Notice('GTD: loaded');
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
			const l = lines[i]!;
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
			const l = lines[i]!;
			const leading = l.match(/^(\s*)/)?.[1] ?? '';
			lines[i] = l.slice(leading.length);
			const newLeading = leading.length + indentDiff >= 0
				? ' '.repeat(leading.length + indentDiff)
				: '';
			lines[i] = newLeading + lines[i];
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
		} catch (_) {}

		// Create GTD files with combined English-Chinese names
		for (const fname of Object.values(gtdFilenames)) {
			const filePath = `${base}/${fname}.md`;
			try {
				if (!(await this.app.vault.adapter.exists(filePath))) {
					await this.app.vault.create(filePath, '\n');
				}
			} catch (_) {}
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
			this.appendClockLog(filePath, line, result.startDate, result.endDate);
			new Notice(`⏱ ${dur}`);
			return;
		}

		// Different task: stop old (and log it if long enough), start new
		const oldResult = stopTimer();
		if (oldResult && oldResult.elapsedMs >= 60000) {
			this.appendClockLog(current.filePath, current.line, oldResult.startDate, oldResult.endDate);
		}
		startTimer(filePath, line);
		new Notice(t('timerStarted', this.settings.lang));
	}

	async appendClockLog(filePath: string, line: number, start: Date, end: Date) {
		try {
			const content = await this.app.vault.adapter.read(filePath);
			const lines = content.split('\n');
			const task = parseTaskLines(lines, line);
			if (!task) return;

			const clockLine = formatClockLine(start, end, metaKeywords[this.settings.lang]!.clock);
			const insertAt = line + task.metaLineCount + 1;
			lines.splice(insertAt, 0, clockLine);
			await this.app.vault.adapter.write(filePath, lines.join('\n'));

			const leaves = this.app.workspace.getLeavesOfType(AGENDA_VIEW_TYPE);
			if (leaves.length > 0) {
				(leaves[0]!.view as unknown as AgendaView).refresh();
			}
		} catch (_) {}
	}

	toggleAgendaView() {
		const leaves = this.app.workspace.getLeavesOfType(AGENDA_VIEW_TYPE);
		if (leaves.length > 0) {
			leaves[0]!.detach();
		} else {
			this.activateAgendaView();
		}
	}

	async activateAgendaView() {
		const leaf = this.app.workspace.getRightLeaf(false);
		if (!leaf) return;
		await leaf.setViewState({ type: AGENDA_VIEW_TYPE, active: true });
		this.app.workspace.revealLeaf(leaf);
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData()) as GtdPluginSettings;
	}

	/** Switch the body-level theme class for GTD */
	applyTheme() {
		document.body.classList.remove('gtd-theme-basic', 'gtd-theme-premium-dark');
		document.body.classList.add('gtd-theme-' + this.settings.theme);
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
			(leaf.view as unknown as AgendaView).updateSettings(this.settings);
		}
		const tlLeaves = this.app.workspace.getLeavesOfType(TIMELINE_VIEW_TYPE);
		for (const leaf of tlLeaves) {
			(leaf.view as unknown as TimelineView).updateSettings(this.settings.lang);
		}
		const stLeaves = this.app.workspace.getLeavesOfType(STATS_VIEW_TYPE);
		for (const leaf of stLeaves) {
			(leaf.view as unknown as StatsView).updateSettings(this.settings.lang);
		}
	}
}
