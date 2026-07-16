import { Plugin, Notice, TAbstractFile } from 'obsidian';
import { GtdPluginSettings, GtdSettingTab, DEFAULT_SETTINGS } from './settings';
import { gtdDecorationField } from './utils/editor-ext';
import { FileCache } from './utils/file-cache';
import { ParserCache } from './utils/parser-cache';
import { AgendaView, AGENDA_VIEW_TYPE } from './views/agenda-view';
import { TimelineView, TIMELINE_VIEW_TYPE } from './views/timeline-view';
import { StatsView, STATS_VIEW_TYPE } from './views/stats-view';
import {
	getCurrentTimer,
	setTickCallback,
} from './utils/timer';
import {
	setPomodoroConfig,
	setPomodoroCallbacks,
	setRegisterIntervalFn as setPomodoroRegisterIntervalFn,
	setupPomodoroCallbacks,
} from './utils/pomodoro';
import { checkMorningReminder } from './utils/morning-reminder';
import { ensureGtdFolders } from './utils/file-ops';
import { toggleAgendaView, activateAgendaView } from './utils/view-utils';
import { registerCommands } from './commands/index';
import { createTimerAPI } from './commands/timer-commands';

export default class OrgGtdPlugin extends Plugin {
	settings: GtdPluginSettings = { ...DEFAULT_SETTINGS };
	private fileCache!: FileCache;
	private parserCache!: ParserCache;

	async onload() {
		await this.loadSettings();
		this.applyTheme();
		this.syncPomodoroConfig();

		this.addSettingTab(new GtdSettingTab(this.app, this));
		this.registerEditorExtension([gtdDecorationField]);

		// Shared file cache for all views — invalidated on vault events
		this.fileCache = new FileCache(this.settings.gtdFolder + '/');
		// Parser LRU cache — invalidated alongside file cache
		this.parserCache = new ParserCache();
		this.registerEvent(
			this.app.vault.on('modify', (file: TAbstractFile) => {
				this.fileCache.invalidate(file.path);
				this.parserCache.invalidate(file.path);
			}),
		);
		this.registerEvent(
			this.app.vault.on('create', (file: TAbstractFile) => {
				this.fileCache.invalidate(file.path);
				this.parserCache.invalidate(file.path);
			}),
		);
		this.registerEvent(
			this.app.vault.on('delete', (file: TAbstractFile) => {
				this.fileCache.invalidate(file.path);
				this.parserCache.invalidate(file.path);
			}),
		);
		this.registerEvent(
			this.app.vault.on('rename', (file: TAbstractFile, oldPath: string) => {
				this.fileCache.invalidate(file.path);
				this.parserCache.invalidate(file.path);
				this.fileCache.invalidate(oldPath);
				this.parserCache.invalidate(oldPath);
			}),
		);

		// Register pomodoro interval for lifecycle-safe cleanup
		setPomodoroRegisterIntervalFn((id) => this.registerInterval(id));

		// Ensure GTD folder structure exists
		this.app.workspace.onLayoutReady(() => {
			void ensureGtdFolders(this, this.settings).then((inboxPath) => {
				this.settings.inboxPath = inboxPath;
			});
			void checkMorningReminder(this);
		});

		// --- Register all commands (split across functional modules) ---
		registerCommands(this);

		// Timer state-change callback: immediate UI update on start/pause/resume/stop
		setTickCallback(() => {
			const leaves = this.app.workspace.getLeavesOfType(AGENDA_VIEW_TYPE);
			const leaf = leaves[0];
			if (leaf?.view instanceof AgendaView) {
				leaf.view.refreshTimerOnly();
			}
		});

		// Periodic timer display refresh (caller manages interval lifecycle)
		this.registerInterval(
			window.setInterval(() => {
				if (getCurrentTimer()?.running) {
					const leaves =
						this.app.workspace.getLeavesOfType(AGENDA_VIEW_TYPE);
					const leaf = leaves[0];
					if (leaf?.view instanceof AgendaView) {
						leaf.view.refreshTimerOnly();
					}
				}
			}, 5000),
		);

		// --- Pomodoro setup ---
		setupPomodoroCallbacks(this);

		// --- Agenda view (sidebar) ---
		const timerAPI = createTimerAPI(this);

		this.registerView(
			AGENDA_VIEW_TYPE,
			(leaf) => new AgendaView(leaf, this.settings, timerAPI, this.fileCache, this.parserCache),
		);

		this.addRibbonIcon('list-checks', 'GTD', () => {
			toggleAgendaView(this.app.workspace);
		});

		this.registerView(
			TIMELINE_VIEW_TYPE,
			(leaf) => new TimelineView(leaf, this.settings.lang, this.fileCache, this.parserCache),
		);
		this.registerView(
			STATS_VIEW_TYPE,
			(leaf) => new StatsView(leaf, this.settings.lang, this.fileCache, this.parserCache),
		);

		// Auto-open agenda only if not already open
		this.app.workspace.onLayoutReady(() => {
			const existing =
				this.app.workspace.getLeavesOfType(AGENDA_VIEW_TYPE);
			if (existing.length === 0) {
				void activateAgendaView(this.app.workspace);
			}
		});

		// First-run welcome (registered via registerInterval so it's cleaned up on unload)
		this.registerInterval(
			window.setTimeout(() => {
				if (this.settings.firstRun) {
					this.settings.firstRun = false;
					void this.saveSettings();
					new Notice(
						'👋 GTD Workflow 已加载 — 查看设置中的「快速开始」了解如何使用',
					);
				}
			}, 2000),
		);

		new Notice('Gtd: loaded');
	}

	onunload() {
		// Clear callbacks to prevent stale references after plugin unload
		setTickCallback(null);
		setPomodoroCallbacks(null, null);
		setPomodoroRegisterIntervalFn(null);
		// Clear any pending refresh timers via cache invalidation
		this.fileCache.invalidateAll();
		this.parserCache.invalidateAll();
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			(await this.loadData()) as Partial<GtdPluginSettings>,
		);
	}

	/** Switch the body-level theme class for GTD */
	applyTheme() {
		activeDocument.body.classList.remove(
			'gtd-theme-basic',
			'gtd-theme-premium-dark',
		);
		activeDocument.body.classList.add(
			'gtd-theme-' + this.settings.theme,
		);
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
		this.fileCache.setGtdPrefix(this.settings.gtdFolder + '/');
		const leaves =
			this.app.workspace.getLeavesOfType(AGENDA_VIEW_TYPE);
		for (const leaf of leaves) {
			if (leaf.view instanceof AgendaView) {
				leaf.view.updateSettings(this.settings);
			}
		}
		const tlLeaves =
			this.app.workspace.getLeavesOfType(TIMELINE_VIEW_TYPE);
		for (const leaf of tlLeaves) {
			if (leaf.view instanceof TimelineView) {
				leaf.view.updateSettings(this.settings.lang);
			}
		}
		const stLeaves =
			this.app.workspace.getLeavesOfType(STATS_VIEW_TYPE);
		for (const leaf of stLeaves) {
			if (leaf.view instanceof StatsView) {
				leaf.view.updateSettings(this.settings.lang);
			}
		}
	}

}
