import { ItemView, WorkspaceLeaf, TFile, MarkdownView, Notice } from 'obsidian';
import { parseTaskLines, isTaskLine, isMetaLine, serializeTask } from '../utils/parser';
import { ParsedTask, Priority } from '../models/task';
import { isToday, isThisWeek, isThisMonth } from '../utils/date-utils';
import { GtdPluginSettings } from '../settings';
import { t, groupTitles } from '../utils/i18n';
import { FileCache } from '../utils/file-cache';
import {
	getPomodoroState, startPomodoro, pausePomodoro, resumePomodoro, stopPomodoro,
} from '../utils/pomodoro';
import { TIMELINE_VIEW_TYPE } from './timeline-view';
import { STATS_VIEW_TYPE } from './stats-view';

export const AGENDA_VIEW_TYPE = 'gtd-agenda';

export interface TimerAPI {
	start: (path: string, line: number) => void;
	pause: () => unknown;
	resume: () => unknown;
	stop: () => { elapsedMs: number; startDate: Date; endDate: Date } | null;
	getCurrent: () => { filePath: string; line: number; running: boolean } | null;
	getElapsed: () => number;
	stopAndLog: (path: string, line: number) => void;
}

interface TaskEntry {
	task: ParsedTask;
	file: TFile;
	date: string;
	dateType: 'scheduled' | 'deadline' | 'closed' | '';
}

export class AgendaView extends ItemView {
	private settings: GtdPluginSettings;
	private timerAPI: TimerAPI;
	private fileCache: FileCache | null;
	private refreshTimer: ReturnType<typeof setTimeout> | null = null;

	constructor(leaf: WorkspaceLeaf, settings: GtdPluginSettings, timerAPI: TimerAPI, fileCache?: FileCache) {
		super(leaf);
		this.settings = settings;
		this.timerAPI = timerAPI;
		this.fileCache = fileCache ?? null;
	}

	getViewType(): string {
		return AGENDA_VIEW_TYPE;
	}

	getDisplayText(): string {
		return 'GTD';
	}

	getIcon(): string {
		return 'list-checks';
	}

	async onOpen() {
		await this.refresh();
	}

	updateSettings(settings: GtdPluginSettings) {
		this.settings = settings;
		void this.refresh();
	}

	private timerBarEl: HTMLElement | null = null;
	private pomodoroEl: HTMLElement | null = null;

	async refresh() {
		// Debounce: coalesce rapid successive refresh() calls
		if (this.refreshTimer) {
			clearTimeout(this.refreshTimer);
		}
		return new Promise<void>((resolve) => {
			this.refreshTimer = setTimeout(() => {
				this.refreshTimer = null;
				void (async () => {
					await this.doFullRefresh();
					resolve();
				})();
			}, 300);
		});
	}

	private async doFullRefresh() {
		const el = this.contentEl;
		el.empty();
		el.addClass('gtd-agenda');

		this.buildCaptureBar(el);
		this.buildNavBar(el);
		this.buildPomodoroSection(el);
		this.buildTimerBar(el);
		const tasks = await this.scanVault();
		const grouped = this.groupTasks(tasks);
		this.renderGroups(el, grouped);
	}

	refreshPomodoro() {
		if (!this.pomodoroEl) return;
		const s = getPomodoroState();
		if (s.phase === 'idle') {
			this.pomodoroEl.addClass('gtd-hidden');
			return;
		}
		this.pomodoroEl.removeClass('gtd-hidden');
		const pct = s.phase === 'focus'
			? (s.secondsRemaining / (25 * 60)) * 100
			: (s.secondsRemaining / (5 * 60)) * 100;
		const min = Math.floor(s.secondsRemaining / 60);
		const sec = s.secondsRemaining % 60;
		const timeStr = `${String(min).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
		const phaseLabel = s.phase === 'focus' ? 'Focus'
			: s.phase === 'shortBreak' ? 'Short break'
			: 'Long break';
		const status = s.paused ? 'Paused' : timeStr;
		const count = `#${s.completedCount + 1}`;

		this.pomodoroEl.empty();
		const header = this.pomodoroEl.createDiv({ cls: 'gtd-pomo-header' });
		header.createEl('span', { text: `${phaseLabel} ${count} — ${status}` });

		// Progress bar
		const barOuter = this.pomodoroEl.createDiv({ cls: 'gtd-pomo-bar-outer' });
		const barInner = barOuter.createDiv({ cls: 'gtd-pomo-bar-inner' });
		barInner.style.width = `${Math.min(100, Math.max(0, 100 - pct))}%`;

		// Controls
		const ctrl = this.pomodoroEl.createDiv({ cls: 'gtd-pomo-ctrl' });
		if (s.paused) {
			ctrl.createEl('button', { text: 'Resume' })
				.addEventListener('click', () => { resumePomodoro(); this.refreshPomodoro(); });
		} else {
			ctrl.createEl('button', { text: 'Pause' })
				.addEventListener('click', () => { pausePomodoro(); this.refreshPomodoro(); });
		}
		ctrl.createEl('button', { text: 'Stop' })
			.addEventListener('click', () => { void stopPomodoro(); void this.refresh(); });
	}

	private buildPomodoroSection(el: HTMLElement) {
		this.pomodoroEl = el.createDiv({ cls: 'gtd-pomo-section' });
		this.refreshPomodoro();
	}

	/** Refresh only the timer bar (called periodically while timer runs) */
	refreshTimerOnly() {
		if (!this.timerBarEl) return;
		const t = this.timerAPI.getCurrent();
		const elapsed = this.timerAPI.getElapsed();
		const totalMin = Math.floor(elapsed / 60000);
		const h = Math.floor(totalMin / 60);
		const m = totalMin % 60;
		const timeStr = h > 0 ? `${h}h ${m}m` : `${m}m`;

		if (t) {
			this.timerBarEl.setText(`T ${timeStr}`);
			this.timerBarEl.addClass('gtd-timer-active');
		} else {
			this.timerBarEl.setText('');
			this.timerBarEl.removeClass('gtd-timer-active');
		}
	}

	private buildTimerBar(el: HTMLElement) {
		this.timerBarEl = el.createDiv({ cls: 'gtd-timer-bar' });
		const t = this.timerAPI.getCurrent();
		if (t) {
			const elapsed = this.timerAPI.getElapsed();
			const totalMin = Math.floor(elapsed / 60000);
			this.timerBarEl.setText(`T ${Math.floor(totalMin / 60)}h ${totalMin % 60}m`);
			this.timerBarEl.addClass('gtd-timer-active');
		}
	}

	// ── Navigation toolbar ──

	private buildNavBar(el: HTMLElement) {
		const nav = el.createDiv({ cls: 'gtd-nav-bar' });
		const L = () => this.settings.lang;

		const openView = (type: string) => {
			const existing = this.app.workspace.getLeavesOfType(type);
			if (existing.length > 0) {
				const existingLeaf = existing[0];
				if (existingLeaf) {
					this.app.workspace.revealLeaf(existingLeaf);
				}
			} else {
				const leaf = this.app.workspace.getRightLeaf(false);
				if (leaf) {
				void leaf.setViewState({ type });
					this.app.workspace.revealLeaf(leaf);
				}
			}
		};

		const tlBtn = nav.createEl('button', {
			cls: 'gtd-nav-btn',
			text: t('timelineTitle', L()),
		});
		tlBtn.addEventListener('click', () => { openView(TIMELINE_VIEW_TYPE); });

		const stBtn = nav.createEl('button', {
			cls: 'gtd-nav-btn',
			text: t('statsTitle', L()),
		});
		stBtn.addEventListener('click', () => { openView(STATS_VIEW_TYPE); });
	}

	// ── Capture bar at the top ──

	private buildCaptureBar(el: HTMLElement) {
		const bar = el.createDiv({ cls: 'gtd-capture-bar' });

		const lang = this.settings.lang;
		const input = bar.createEl('input', {
			cls: 'gtd-capture-input',
			attr: { type: 'text', placeholder: t('quickCapturePlaceholder', lang) },
		});

		const prioritySel = bar.createEl('select', { cls: 'gtd-capture-priority' });
		prioritySel.createEl('option', { text: '#', value: '' });
		prioritySel.createEl('option', { text: 'A', value: 'A' });
		prioritySel.createEl('option', { text: 'B', value: 'B' });
		prioritySel.createEl('option', { text: 'C', value: 'C' });

		const addBtn = bar.createEl('button', {
			cls: 'gtd-capture-btn',
			text: '+',
		});

		const doCapture = async () => {
			const text = input.value.trim();
			if (!text) return;

			const priority = prioritySel.value as Priority | '';
			const prioStr = priority ? `  [#${priority}]` : '';
			const line = `- [ ] ${text}${prioStr}\n`;
			const inboxPath = this.settings.inboxPath;

			try {
				const inbox = this.app.vault.getAbstractFileByPath(inboxPath);
				if (inbox instanceof TFile) {
					await this.app.vault.append(inbox, line);
				} else {
					await this.app.vault.create(inboxPath, line);
				}
				new Notice(`Captured → ${inboxPath}`);
				input.value = '';
				prioritySel.value = '';
				void this.refresh();
			} catch (err) {
				new Notice("Capture failed: " + String(err));
			}
		};

		addBtn.addEventListener('click', () => { void doCapture(); });
		input.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') { void doCapture(); };
		});
	}

	// ── Scan vault ──

	private async scanVault(): Promise<TaskEntry[]> {
		const entries: TaskEntry[] = [];
		const allFiles = this.app.vault.getMarkdownFiles();
		// Only scan files inside the GTD folder
		const gtdPrefix = this.settings.gtdFolder + '/';
		const files = allFiles.filter((f) => f.path.startsWith(gtdPrefix));

		// Update file cache prefix if the cache exists
		if (this.fileCache) {
			this.fileCache.setGtdPrefix(gtdPrefix);
			// If cache was dirty (file changes detected), mark it clean now
			if (this.fileCache.isDirty()) {
				this.fileCache.markClean();
			}
		}

		for (const file of files) {
			const content = this.fileCache
				? await this.fileCache.getOrRead(file, this.app.vault)
				: await this.app.vault.read(file);
			const lines = content.split('\n');

			for (let i = 0; i < lines.length; i++) {
				const currentLine = lines[i];
				if (!currentLine) continue;
				if (!isTaskLine(currentLine)) continue;
				if (isMetaLine(currentLine)) continue; // skip if this is actually a meta line

				const task = parseTaskLines(lines, i);
				if (!task) continue;

				let date = '';
				let dateType: TaskEntry['dateType'] = '';
				if (task.scheduled) { date = task.scheduled; dateType = 'scheduled'; }
				else if (task.deadline) { date = task.deadline; dateType = 'deadline'; }
				else if (task.closed) { date = task.closed; dateType = 'closed'; }

				entries.push({ task, file, date, dateType });

				// Skip metadata lines
				i += task.metaLineCount;
			}
		}

		return entries;
	}

	// ── Group ──

	private groupTasks(entries: TaskEntry[]) {
		const titles = groupTitles(this.settings.lang);
		const todayGroup = { title: titles[0] ?? '', entries: [] as TaskEntry[] };
		const thisWeekGroup = { title: titles[1] ?? '', entries: [] as TaskEntry[] };
		const thisMonthGroup = { title: titles[2] ?? '', entries: [] as TaskEntry[] };
		const futureGroup = { title: titles[3] ?? '', entries: [] as TaskEntry[] };
		const noDateGroup = { title: titles[4] ?? '', entries: [] as TaskEntry[] };

		const { weekStartDay, monthStartDay } = this.settings;

		for (const e of entries) {
			if (!e.date) {
				noDateGroup.entries.push(e);
				continue;
			}
			// Cumulative: This Week includes Today; This Month includes both
			if (isToday(e.date)) {
				todayGroup.entries.push(e);
				thisWeekGroup.entries.push(e);
				thisMonthGroup.entries.push(e);
			} else if (isThisWeek(e.date, weekStartDay)) {
				thisWeekGroup.entries.push(e);
				thisMonthGroup.entries.push(e);
			} else if (isThisMonth(e.date, monthStartDay)) {
				thisMonthGroup.entries.push(e);
			} else {
				futureGroup.entries.push(e);
			}
		}

		return [todayGroup, thisWeekGroup, thisMonthGroup, futureGroup, noDateGroup]
			.filter((g) => g.entries.length > 0);
	}

	// ── Render ──

	private renderGroups(el: HTMLElement, groups: { title: string; entries: TaskEntry[] }[]) {
		const lang = this.settings.lang;
		if (groups.length === 0) {
			el.createEl('div', { text: `${t('noTasks', lang)}. ${t('captureHint', lang)}`, cls: 'gtd-empty' });
			return;
		}

		for (const group of groups) {
			const header = el.createEl('div', { cls: 'gtd-group-header' });
			header.createEl('span', { cls: 'gtd-group-title', text: `${group.title} (${group.entries.length})` });

			const list = el.createEl('div', { cls: 'gtd-task-list' });

			const sorted = [...group.entries].sort((a, b) => {
				if (a.date && b.date && a.date !== b.date) return a.date < b.date ? -1 : 1;
				const order: Record<string, number> = { A: 0, B: 1, C: 2 };
				return (order[a.task.priority ?? ''] ?? 3) - (order[b.task.priority ?? ''] ?? 3);
			});

			for (const entry of sorted) {
				const item = list.createEl('div', { cls: 'gtd-task-item' });

				// Indent subtasks
				const indentPx = entry.task.indent * 16;
				if (indentPx > 0) item.style.paddingLeft = `${indentPx}px`;

				// Click anywhere on the item to navigate (except checkbox)
				item.addEventListener('click', (e) => {
					if ((e.target as HTMLElement).tagName === 'INPUT') return; // checkbox click
					void this.navigateToTask(entry);
				});

				// Row: checkbox + priority + text + file
				const row = item.createDiv({ cls: 'gtd-task-row' });

				// Checkbox
				const chk = row.createEl('input', {
					cls: 'gtd-task-checkbox',
					attr: { type: 'checkbox' },
				});
				chk.checked = entry.task.checked;
				chk.addEventListener('change', () => { void (async () => {
					const fileContent = await this.app.vault.read(entry.file);
					const fileLines = fileContent.split('\n');
					const task = parseTaskLines(fileLines, entry.task.line);
					if (task) {
						task.checked = chk.checked;
						task.closed = chk.checked
							? new Date().toISOString().slice(0, 10)
							: null;
						const serialized = serializeTask(task, this.settings.lang);
						const serLines = serialized.split('\n');
						const end = entry.task.line + task.metaLineCount;
						fileLines.splice(entry.task.line, end - entry.task.line + 1, ...serLines);
						void this.app.vault.modify(entry.file, fileLines.join('\n'));
					}
					void this.refresh();
				})(); });

				// Timer button
				const timerBtn = row.createEl('span', {
					cls: 'gtd-timer-btn',
					text: '▶',
				});
				const currentTimer = this.timerAPI.getCurrent();
				const isThisTaskTimed = currentTimer && currentTimer.filePath === entry.file.path && currentTimer.line === entry.task.line;
				if (isThisTaskTimed) {
					timerBtn.setText(currentTimer.running ? '⏸' : '▶');
					timerBtn.addClass('gtd-timer-active');
				}
				timerBtn.addEventListener('click', (e) => {
					e.stopPropagation();
					const cur = this.timerAPI.getCurrent();
					if (cur && cur.filePath === entry.file.path && cur.line === entry.task.line) {
						// Same task: stop and log
						this.timerAPI.stopAndLog(entry.file.path, entry.task.line);
						timerBtn.setText('▶');
						timerBtn.removeClass('gtd-timer-active');
						void this.refresh();
					} else {
						// Different task: stop old (with log), start new
						const oldCur = this.timerAPI.getCurrent();
						if (oldCur) {
							this.timerAPI.stopAndLog(oldCur.filePath, oldCur.line);
						}
						this.timerAPI.start(entry.file.path, entry.task.line);
						timerBtn.setText('⏸');
						timerBtn.addClass('gtd-timer-active');
						this.refreshTimerOnly();
					}
				});

				// Pomodoro button
				const pomoBtn = row.createEl('span', {
					cls: 'gtd-pomo-btn',
					text: t('pomoLabel', this.settings.lang),
				});
				const ps = getPomodoroState();
				const isThisPomo = ps.phase !== 'idle' && ps.taskFilePath === entry.file.path && ps.taskLine === entry.task.line;
				if (isThisPomo) pomoBtn.addClass('gtd-pomo-btn-active');

				pomoBtn.addEventListener('click', (e) => {
					e.stopPropagation();
					const curPomo = getPomodoroState();
					if (curPomo.phase !== 'idle' && curPomo.taskFilePath === entry.file.path && curPomo.taskLine === entry.task.line) {
						// Toggle pause/resume on this pomodoro
						if (curPomo.paused) {
							resumePomodoro();
						} else if (curPomo.phase === 'focus') {
							pausePomodoro();
						}
						void this.refresh();
						return;
					}
					// Start fresh pomodoro for this task
					// Stop any running timer first
					const curTimer = this.timerAPI.getCurrent();
					if (curTimer) {
						this.timerAPI.stopAndLog(curTimer.filePath, curTimer.line);
					}
					startPomodoro(entry.file.path, entry.task.line);
					void this.refresh();
				});

				// Priority badge (no #)
				if (entry.task.priority) {
					row.createEl('span', {
						cls: `gtd-priority gtd-priority-${entry.task.priority.toLowerCase()}`,
						text: entry.task.priority,
					});
				}

				// Task text
				const textEl = row.createEl('span', { cls: 'gtd-task-text', text: entry.task.text });
				if (entry.task.checked) textEl.addClass('gtd-done');

				// File link
				row.createEl('a', { cls: 'gtd-file-link', text: entry.file.basename });

				// No date display in agenda view (grouping is sufficient)
			}
		}
	}

	private async navigateToTask(entry: TaskEntry) {
		const leaf = this.app.workspace.getLeaf(false);
		await leaf.openFile(entry.file, { active: true });
		window.setTimeout(() => {
			const view = this.app.workspace.getActiveViewOfType(MarkdownView);
			if (view) {
				view.editor.setCursor(entry.task.line, 0);
				view.editor.scrollIntoView(
					{ from: { line: entry.task.line, ch: 0 }, to: { line: entry.task.line, ch: 0 } },
					true,
				);
			}
		}, 200);
	}
}
