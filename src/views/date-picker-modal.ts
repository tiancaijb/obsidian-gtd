import { App, Modal } from 'obsidian';
import { t } from '../utils/i18n';

export type DatePickerResult = string;

/**
 * Date picker: text input (20260630) + single 📅 icon for calendar popup.
 */
export class DatePickerModal extends Modal {
	private resolved: ((value: DatePickerResult) => void) | null = null;

	constructor(
		app: App,
		private title: string,
		private currentDate: string | null = null,
		private lang: 'zh' | 'en' = 'zh',
	) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('gtd-datepicker-modal');
		contentEl.createEl('h3', { text: this.title });

		if (this.currentDate) {
			contentEl.createEl('div', {
				cls: 'gtd-dp-current',
				text: `${t('current', this.lang)}: ${this.currentDate}`,
			});
		}

		// Quick buttons
		const quickRow = contentEl.createDiv({ cls: 'gtd-dp-quick-row' });
		const presets = [
			{ label: t('today', this.lang), offset: 0 },
			{ label: t('tomorrow', this.lang), offset: 1 },
			{ label: t('plus3d', this.lang), offset: 3 },
			{ label: t('plus7d', this.lang), offset: 7 },
			{ label: t('plus14d', this.lang), offset: 14 },
		];
		for (const p of presets) {
			const btn = quickRow.createEl('button', { cls: 'gtd-dp-btn', text: p.label });
			btn.addEventListener('click', () => {
				const d = new Date();
				d.setDate(d.getDate() + p.offset);
				this.resolved?.(fmt(d));
				this.close();
			});
		}

		// Label
		contentEl.createEl('div', { cls: 'gtd-dp-input-label', text: t('enterDate', this.lang) });

		// Input row: text input + calendar icon
		const inputRow = contentEl.createDiv({ cls: 'gtd-dp-input-row' });

		const textInput = inputRow.createEl('input', {
			cls: 'gtd-dp-text-input',
			attr: {
				type: 'text',
				placeholder: '20260630',
				value: this.currentDate ? this.currentDate.replace(/-/g, '') : '',
			},
		});

		// Hidden native date input — positioned inside inputRow for correct popup position
		const calWrap = inputRow.createDiv({ cls: 'gtd-dp-cal-wrap' });
		const dateInput = calWrap.createEl('input', {
			cls: 'gtd-dp-hidden-date',
			attr: { type: 'date', value: this.currentDate ?? '' },
		});

		const calBtn = calWrap.createEl('button', { cls: 'gtd-dp-cal-btn', text: '📅' });
		calBtn.addEventListener('click', () => {
			dateInput.showPicker?.();
		});

		dateInput.addEventListener('change', () => {
			if (dateInput.value) {
				textInput.value = dateInput.value.replace(/-/g, '');
			}
		});

		textInput.addEventListener('input', () => {
			const v = textInput.value.replace(/-/g, '');
			if (v.length === 8 && /^\d{8}$/.test(v)) {
				dateInput.value = `${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}`;
			}
		});

		// Bottom buttons
		const bottomRow = contentEl.createDiv({ cls: 'gtd-dp-bottom-row' });

		if (this.currentDate) {
			bottomRow.createEl('button', { cls: 'gtd-dp-remove', text: t('remove', this.lang) })
				.addEventListener('click', () => {
					this.resolved?.('remove');
					this.close();
				});
		}

		bottomRow.createEl('button', { cls: 'gtd-dp-set-btn', text: t('set', this.lang) })
			.addEventListener('click', () => doSet());

		bottomRow.createEl('button', { cls: 'gtd-dp-cancel', text: t('cancel', this.lang) })
			.addEventListener('click', () => this.close());

		const doSet = () => {
			const v = textInput.value.replace(/-/g, '');
			if (v.length === 8 && /^\d{8}$/.test(v)) {
				this.resolved?.(`${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6,8)}`);
				this.close();
			}
		};

		textInput.addEventListener('keydown', (e) => {
			if (e.key === 'Enter') doSet();
			if (e.key === 'Escape') this.close();
		});

		window.setTimeout(() => textInput.focus(), 50);
	}

	onClose() {
		this.contentEl.empty();
	}

	async waitForResult(): Promise<DatePickerResult | null> {
		return new Promise((resolve) => {
			this.resolved = resolve;
		});
	}
}

function fmt(d: Date): string {
	return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
