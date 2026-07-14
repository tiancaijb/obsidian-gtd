import { Plugin, Notice } from 'obsidian';
import { t, gtdFilenames } from './utils/i18n';
import { GtdPluginSettings, GtdSettingTab, DEFAULT_SETTINGS } from './settings';
import { gtdDecorationField } from './utils/editor-ext';
import { AgendaView, AGENDA_VIEW_TYPE, TimerAPI } from './views/agenda-view';
import { TimelineView, TIMELINE_VIEW_TYPE } from './views/timeline-view';
import { StatsView, STATS_VIEW_TYPE } from './views/stats-view';
import {
	startTimer,
	pauseTimer,
	resumeTimer,
	stopTimer,
	getCurrentTimer,
	getElapsed as getTimerElapsed,
	formatDuration,
	setTickCallback,
} from './utils/timer';
import {
	setPomodoroConfig,
	setPomodoroCallbacks,
	PomodoroPhase,
	PomodoroState,
	setRegisterIntervalFn as setPomodoroRegisterIntervalFn,
} from './utils/pomodoro';
import { checkMorningReminder } from './utils/morning-reminder';
import { appendClockLog } from './utils/file-ops';
import { toggleAgendaView, activateAgendaView } from './utils/view-utils';
import { registerCommands } from './commands/index';

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
		setPomodoroCallbacks(
			() => {
				const leaves =
					this.app.workspace.getLeavesOfType(AGENDA_VIEW_TYPE);
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
						this,
						ps.taskFilePath,
						ps.taskLine,
						startDate,
						endDate,
						this.settings.lang,
					);
				}
			},
		);

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
					new Notice(
						`⏱ ${dur} — ${t('timerTooShort', this.settings.lang)}`,
					);
					return;
				}
				void appendClockLog(
					this,
					path,
					line,
					result.startDate,
					result.endDate,
					this.settings.lang,
				);
				new Notice(`⏱ ${dur}`);
			},
		};

		this.registerView(
			AGENDA_VIEW_TYPE,
			(leaf) => new AgendaView(leaf, this.settings, timerAPI),
		);

		this.addRibbonIcon('list-checks', 'GTD', () => {
			toggleAgendaView(this.app.workspace);
		});

		this.registerView(
			TIMELINE_VIEW_TYPE,
			(leaf) => new TimelineView(leaf, this.settings.lang),
		);
		this.registerView(
			STATS_VIEW_TYPE,
			(leaf) => new StatsView(leaf, this.settings.lang),
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
}
