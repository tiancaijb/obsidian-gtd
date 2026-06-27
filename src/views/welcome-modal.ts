import { App, Modal, Setting } from 'obsidian';
import { Lang, t } from '../utils/i18n';

export class WelcomeModal extends Modal {
	private lang: Lang;
	private onDone: () => void;

	constructor(app: App, lang: Lang, onDone: () => void) {
		super(app);
		this.lang = lang;
		this.onDone = onDone;
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('gtd-welcome');

		contentEl.createEl('h2', { text: t('welcomeTitle', this.lang) });
		contentEl.createEl('p', {
			text: t('welcomeDesc', this.lang),
			cls: 'gtd-welcome-desc',
		});

		const steps = [
			{ title: t('welcomeStep1', this.lang), desc: t('welcomeStep1Desc', this.lang) },
			{ title: t('welcomeStep2', this.lang), desc: t('welcomeStep2Desc', this.lang) },
			{ title: t('welcomeStep3', this.lang), desc: t('welcomeStep3Desc', this.lang) },
			{ title: t('welcomeStep4', this.lang), desc: t('welcomeStep4Desc', this.lang) },
		];

		for (const step of steps) {
			const item = contentEl.createDiv({ cls: 'gtd-welcome-step' });
			item.createEl('strong', { text: step.title });
			item.createEl('p', { text: step.desc });
		}

		const btnDiv = contentEl.createDiv({ cls: 'gtd-welcome-btn' });
		const btn = btnDiv.createEl('button', { text: t('welcomeNext', this.lang) });
		btn.addEventListener('click', () => {
			this.onDone();
			this.close();
		});
	}

	onClose() {
		this.contentEl.empty();
	}
}
