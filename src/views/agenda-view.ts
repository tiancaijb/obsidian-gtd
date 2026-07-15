import { ItemView, WorkspaceLeaf, MarkdownView } from 'obsidian';
import { parseTaskLines, isTaskLine, isMetaLine } from '../utils/parser';
import { GtdPluginSettings } from '../settings';
import { FileCache } from '../utils/file-cache';
import { AGENDA_VIEW_TYPE, TimerAPI, TaskEntry } from './agenda-types';
import { AgendaUI, groupTasks } from './agenda-ui';

export { AGENDA_VIEW_TYPE };
export type { TimerAPI };

/**
 * AgendaView — GTD task overview sidebar.
 *
 * Responsibilities:
 *  - Lifecycle (open, close, settings update)
 *  - Data fetching (scanVault)
 *  - Task navigation
 *  - Delegates all DOM rendering to AgendaUI
 *
 * The class is kept slim per AGENTS.md guidelines. UI logic lives in agenda-ui.ts.
 */
export class AgendaView extends ItemView {
	private settings: GtdPluginSettings;
	private timerAPI: TimerAPI;
	private fileCache: FileCache | null;
	private refreshTimer: number | null = null;
	private ui: AgendaUI;

	constructor(leaf: WorkspaceLeaf, settings: GtdPluginSettings, timerAPI: TimerAPI, fileCache?: FileCache) {
		super(leaf);
		this.settings = settings;
		this.timerAPI = timerAPI;
		this.fileCache = fileCache ?? null;
		this.ui = this.createUI();
	}

	/** Factory method — constructs AgendaUI with the view's dependencies. */
	private createUI(): AgendaUI {
		return new AgendaUI({
			settings: this.settings,
			timerAPI: this.timerAPI,
			app: this.app,
			refresh: () => this.refresh(),
			navigateToTask: (entry) => this.navigateToTask(entry),
		});
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
		// Recreate UI with updated settings
		this.ui = this.createUI();
		void this.refresh();
	}

	async refresh() {
		// Debounce: coalesce rapid successive refresh() calls
		if (this.refreshTimer) {
			window.clearTimeout(this.refreshTimer);
		}
		return new Promise<void>((resolve) => {
			this.refreshTimer = window.setTimeout(() => {
				this.refreshTimer = null;
				void (async () => {
					await this.doFullRefresh();
					resolve();
				})();
			}, 300);
		});
	}

	/** Root orchestrator — build all UI sections and populate with data. */
	private async doFullRefresh() {
		const el = this.contentEl;
		el.empty();
		el.addClass('gtd-agenda');

		this.ui.buildCaptureBar(el);
		this.ui.buildNavBar(el);
		this.ui.buildPomodoroSection(el);
		this.ui.buildTimerBar(el);
		const tasks = await this.scanVault();
		const grouped = groupTasks(tasks, this.settings);
		this.ui.renderGroups(el, grouped);
	}

	/** Refresh the pomodoro section UI (called externally by pomodoro tick). */
	refreshPomodoro(): void {
		this.ui.refreshPomodoro();
	}

	/** Refresh the timer bar UI (called externally by timer tick). */
	refreshTimerOnly(): void {
		this.ui.refreshTimerOnly();
	}

	// ── Vault scanning ───────────────────────────────────────────────────

	/**
	 * Scan GTD vault files and return parsed task entries.
	 * Uses FileCache if available to avoid redundant reads.
	 */
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

	// ── Navigation ───────────────────────────────────────────────────────

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
