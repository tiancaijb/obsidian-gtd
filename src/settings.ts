import { App, PluginSettingTab, Setting } from 'obsidian';
import OrgGtdPlugin from './main';
import { Lang, t } from './utils/i18n';

export interface GtdPluginSettings {
	theme: string;
	gtdFolder: string;
	inboxPath: string;
	futureDays: number;
	lang: Lang;
	weekStartDay: number; // 1=Mon ... 7=Sun
	monthStartDay: number;
	pomodoroFocus: number;
	pomodoroShortBreak: number;
	pomodoroLongBreak: number;
	pomodoroLongBreakAfter: number;
	firstRun: boolean;
	morningReminderEnabled: boolean;
	morningReminderStart: number;
	morningReminderEnd: number;
}

export const DEFAULT_SETTINGS: GtdPluginSettings = {
	theme: 'basic',
	gtdFolder: 'gtd',
	inboxPath: 'gtd/inbox.md',
	futureDays: 90,
	lang: 'zh',
	weekStartDay: 1,
	monthStartDay: 1,
	pomodoroFocus: 25,
	pomodoroShortBreak: 5,
	pomodoroLongBreak: 15,
	pomodoroLongBreakAfter: 4,
	firstRun: true,
	morningReminderEnabled: false,
	morningReminderStart: 390,
	morningReminderEnd: 510,
};

export class GtdSettingTab extends PluginSettingTab {
	plugin: OrgGtdPlugin;

	constructor(app: App, plugin: OrgGtdPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		const L = () => this.plugin.settings.lang;

		new Setting(containerEl).setName(t('settingsTitle', L())).setHeading();

		// ── Quick Start ──
		new Setting(containerEl).setName(t('quickStart', L())).setDesc(t('quickStartDesc', L())).setHeading();

		const commands = [
			{ name: t('qCmdCapture', L()), desc: t('qCmdCaptureDesc', L()) },
			{ name: t('qCmdPrio', L()), desc: t('qCmdPrioDesc', L()) },
			{ name: t('qCmdAgenda', L()), desc: t('qCmdAgendaDesc', L()) },
			{ name: t('qCmdTimer', L()), desc: t('qCmdTimerDesc', L()) },
			{ name: t('qCmdPromote', L()), desc: t('qCmdPromoteDesc', L()) },
			{ name: t('qCmdTimeline', L()), desc: t('qCmdTimelineDesc', L()) },
			{ name: t('qCmdStats', L()), desc: t('qCmdStatsDesc', L()) },
		];

		const cmdList = containerEl.createEl('div', { cls: 'gtd-quickstart' });
		for (const cmd of commands) {
			const row = cmdList.createEl('div', { cls: 'gtd-quickstart-row' });
			row.createEl('span', { text: cmd.name, cls: 'gtd-quickstart-name' });
			row.createEl('span', { text: cmd.desc, cls: 'gtd-quickstart-desc' });
		}

		// ── GTD Folder ──
		new Setting(containerEl).setName(t('gtdFolderTitle', L())).setHeading();

		new Setting(containerEl)
			.setName(t('baseFolder', L()))
			.setDesc(t('baseFolderDesc', L()))
			.addText((text) =>
				text
					.setPlaceholder('gtd')
					.setValue(this.plugin.settings.gtdFolder)
					.onChange(async (value) => {
						this.plugin.settings.gtdFolder = value;
						await this.plugin.saveSettings();
						void this.display();
					}),
			);



		// ── Language ──
		new Setting(containerEl).setName(t('settingsLanguage', L())).setHeading();

		new Setting(containerEl)
			.setName(t('languageLabel', L()))
			.setDesc(t('languageDesc', L()))
			.addDropdown((dd) =>
				dd
					.addOption('zh', '中文')
					.addOption('en', 'English')
					.setValue(this.plugin.settings.lang)
					.onChange((v) => {
						this.plugin.settings.lang = v as 'zh' | 'en';
						this.plugin.saveData(this.plugin.settings);
						void this.display();
					}),
			);

		// ── Agenda ──
		new Setting(containerEl).setName(t('settingsAgenda', L())).setHeading();

		new Setting(containerEl)
			.setName(t('weekStartDay', L()))
			.setDesc(t('weekStartDayDesc', L()))
			.addDropdown((dd) => {
				const days = [
					{ v: '1', label: t('monday', L()) },
					{ v: '2', label: t('tuesday', L()) },
					{ v: '3', label: t('wednesday', L()) },
					{ v: '4', label: t('thursday', L()) },
					{ v: '5', label: t('friday', L()) },
					{ v: '6', label: t('saturday', L()) },
					{ v: '7', label: t('sunday', L()) },
				];
				for (const d of days) dd.addOption(d.v, d.label);
				dd.setValue(String(this.plugin.settings.weekStartDay));
				dd.onChange(async (v) => {
					this.plugin.settings.weekStartDay = parseInt(v);
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName(t('monthStartDay', L()))
			.setDesc(t('monthStartDayDesc', L()))
			.addText((text) =>
				text
					.setPlaceholder('1')
					.setValue(String(this.plugin.settings.monthStartDay))
					.onChange(async (v) => {
						const n = parseInt(v);
						if (n >= 1 && n <= 28) {
							this.plugin.settings.monthStartDay = n;
							await this.plugin.saveSettings();
						}
					}),
			);

		new Setting(containerEl)
			.setName(t('futureCutoff', L()))
			.setDesc(t('futureCutoffDesc', L()))
			.addText((text) =>
				text
					.setPlaceholder('90')
					.setValue(String(this.plugin.settings.futureDays))
					.onChange(async (v) => {
						const n = parseInt(v);
						if (n >= 7 && n <= 999) {
							this.plugin.settings.futureDays = n;
							await this.plugin.saveSettings();
						}
					}),
			);

		// ── Morning Reminder ──
		new Setting(containerEl).setName(t('morningReminder', L())).setHeading();

		const desc = containerEl.createEl('div', { cls: 'gtd-setting-desc' });
		desc.innerHTML = `<p>${t('morningReminderDesc', L())} — Andrew Huberman</p>
<p><a href="https://www.youtube.com/watch?v=nm1TxQj9IsQ" target="_blank">📺 Huberman Lab: Master Your Sleep</a></p>`;

		new Setting(containerEl)
			.setName(t('morningReminderEnable', L()))
			.setDesc('')
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.morningReminderEnabled)
					.onChange(async (v) => {
						this.plugin.settings.morningReminderEnabled = v;
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName(t('morningReminderStart', L()))
			.setDesc(t('timeFormat', L()))
			.addText((text) =>
				text
					.setPlaceholder('06:30')
					.setValue(this.formatTime(this.plugin.settings.morningReminderStart))
					.onChange(async (v) => {
						const m = this.parseTime(v);
						if (m !== null) {
							this.plugin.settings.morningReminderStart = m;
							await this.plugin.saveSettings();
						}
					}),
			);

		new Setting(containerEl)
			.setName(t('morningReminderEnd', L()))
			.setDesc(t('timeFormat', L()))
			.addText((text) =>
				text
					.setPlaceholder('08:30')
					.setValue(this.formatTime(this.plugin.settings.morningReminderEnd))
					.onChange(async (v) => {
						const m = this.parseTime(v);
						if (m !== null) {
							this.plugin.settings.morningReminderEnd = m;
							await this.plugin.saveSettings();
						}
					}),
			);

		// ── Pomodoro ──
		new Setting(containerEl).setName(t('pomodoroTitle', L())).setHeading();

		new Setting(containerEl)
			.setName(t('focusMin', L()))
			.setDesc(t('focusMinDesc', L()))
			.addText((text) =>
				text
					.setPlaceholder('25')
					.setValue(String(this.plugin.settings.pomodoroFocus))
					.onChange(async (v) => {
						const n = parseInt(v);
						if (n > 0 && n < 1000) {
							this.plugin.settings.pomodoroFocus = n;
							await this.plugin.saveSettings();
						}
					}),
			);

		new Setting(containerEl)
			.setName(t('shortBreak', L()))
			.setDesc(t('shortBreakDesc', L()))
			.addText((text) =>
				text
					.setPlaceholder('5')
					.setValue(String(this.plugin.settings.pomodoroShortBreak))
					.onChange(async (v) => {
						const n = parseInt(v);
						if (n > 0 && n < 1000) {
							this.plugin.settings.pomodoroShortBreak = n;
							await this.plugin.saveSettings();
						}
					}),
			);

		new Setting(containerEl)
			.setName(t('longBreak', L()))
			.setDesc(t('longBreakDesc', L()))
			.addText((text) =>
				text
					.setPlaceholder('15')
					.setValue(String(this.plugin.settings.pomodoroLongBreak))
					.onChange(async (v) => {
						const n = parseInt(v);
						if (n > 0 && n < 1000) {
							this.plugin.settings.pomodoroLongBreak = n;
							await this.plugin.saveSettings();
						}
					}),
			);

		new Setting(containerEl)
			.setName(t('longBreakAfter', L()))
			.setDesc(t('longBreakAfterDesc', L()))
			.addText((text) =>
				text
					.setPlaceholder('4')
					.setValue(String(this.plugin.settings.pomodoroLongBreakAfter))
					.onChange(async (v) => {
						const n = parseInt(v);
						if (n > 0 && n < 100) {
							this.plugin.settings.pomodoroLongBreakAfter = n;
							await this.plugin.saveSettings();
						}
					}),
			);

		new Setting(containerEl)
			.setName(t('pomoReset', L()))
			.setDesc(t('pomoResetDesc', L()))
			.addButton((btn) =>
				btn
					.setButtonText(t('resetToDefaults', L()))
					.onClick(async () => {
						this.plugin.settings.pomodoroFocus = DEFAULT_SETTINGS.pomodoroFocus;
						this.plugin.settings.pomodoroShortBreak = DEFAULT_SETTINGS.pomodoroShortBreak;
						this.plugin.settings.pomodoroLongBreak = DEFAULT_SETTINGS.pomodoroLongBreak;
						this.plugin.settings.pomodoroLongBreakAfter = DEFAULT_SETTINGS.pomodoroLongBreakAfter;
						await this.plugin.saveSettings();
						void this.display();
					}),
			);

	}

	private formatTime(minutes: number): string {
		const h = Math.floor(minutes / 60).toString().padStart(2, '0');
		const m = (minutes % 60).toString().padStart(2, '0');
		return `${h}:${m}`;
	}

	private parseTime(str: string): number | null {
		const match = str.match(/^(\d{1,2}):(\d{2})$/);
		if (!match) return null;
		const h = parseInt(match[1]!, 10);
		const m = parseInt(match[2]!, 10);
		if (h < 0 || h > 23 || m < 0 || m > 59) return null;
		return h * 60 + m;
	}
}
