import { App, Modal, Notice, TFile } from 'obsidian';
import { Priority } from '../models/task';
import { t, metaKeywords } from '../utils/i18n';

const PRIOS: { key: string; value: Priority | ''; label: string; color: string }[] = [
	{ key: '0', value: '', label: 'None', color: '#888' },
	{ key: '1', value: 'A', label: '🅰 High', color: '#e74c3c' },
	{ key: '2', value: 'B', label: '🅱 Medium', color: '#e67e22' },
	{ key: '3', value: 'C', label: '🅲 Low', color: '#3498db' },
];

export class CaptureModal extends Modal {
	private selectedPrio: Priority | '' = '';
	private scheduledDate = '';
	private deadlineDate = '';

	constructor(app: App, private inboxPath: string, private lang: 'zh' | 'en' = 'zh') {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass('gtd-capture-modal');

		contentEl.createEl('h3', { text: `📥 ${t('quickCapture', this.lang)}` });

		// Task input
		const input = contentEl.createEl('input', {
			cls: 'gtd-capture-input',
			attr: { type: 'text', placeholder: `${t('quickCapturePlaceholder', this.lang)} (Enter = submit)` },
		});
		window.setTimeout(() => { input.focus(); }, 50);

		// Priority hint + buttons
		const prioRow = contentEl.createDiv({ cls: 'gtd-capture-prio-row' });
		prioRow.createEl('span', {
			cls: 'gtd-capture-label',
			text: t('prioHint', this.lang),
		});

		const btnGroup = contentEl.createDiv({ cls: 'gtd-prio-btn-group' });
		const prioButtons: HTMLButtonElement[] = [];

		const prioLabels: Record<string, string> = {
			'': t('prioNone', this.lang),
			A: t('prioHigh', this.lang),
			B: t('prioMedium', this.lang),
			C: t('prioLow', this.lang),
		};

		for (const p of PRIOS) {
			const btn = btnGroup.createEl('button', {
				cls: 'gtd-prio-btn',
				text: prioLabels[p.value] ?? p.label,
				attr: { 'data-value': p.value },
			});
			if (p.value) btn.style.cssText = `--prio-color: ${p.color};`;
			btn.addEventListener('click', () => {
				this.selectedPrio = p.value;
				prioButtons.forEach((b) => { b.removeClass('active'); });
				btn.addClass('active');
				input.focus();
			});
			prioButtons.push(btn);
		}

		// Date row: SCHEDULED + DEADLINE
		const dateRow = contentEl.createDiv({ cls: 'gtd-capture-date-row' });

		// SCHEDULED
		const schedGroup = dateRow.createDiv({ cls: 'gtd-capture-date-group' });
		schedGroup.createEl('label', { cls: 'gtd-capture-date-label', text: t('scheduled', this.lang) });
		const schedInput = schedGroup.createEl('input', {
			cls: 'gtd-date-input',
			attr: { type: 'date' },
		});
		schedInput.addEventListener('change', () => { this.scheduledDate = schedInput.value; });
		schedInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') void doCapture(); });

		// DEADLINE
		const deadGroup = dateRow.createDiv({ cls: 'gtd-capture-date-group' });
		deadGroup.createEl('label', { cls: 'gtd-capture-date-label', text: t('deadline', this.lang) });
		const deadInput = deadGroup.createEl('input', {
			cls: 'gtd-date-input',
			attr: { type: 'date' },
		});
		deadInput.addEventListener('change', () => { this.deadlineDate = deadInput.value; });
		deadInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') void doCapture(); });

		// Submit
		const submitBtn = contentEl.createEl('button', {
			cls: 'gtd-capture-submit',
			text: t('capture', this.lang),
		});

		const doCapture = async () => {
			const text = input.value.trim();
			if (!text) {
				new Notice('Enter task text');
				input.focus();
				return;
			}

			const prio = this.selectedPrio ? `  [#${this.selectedPrio}]` : '';
			const kw = metaKeywords[this.lang];
			const lines = [`- [ ] ${text}${prio}`];
			if (this.scheduledDate) lines.push(`  ${kw.scheduled}: <${this.scheduledDate}>`);
			if (this.deadlineDate) lines.push(`  ${kw.deadline}: <${this.deadlineDate}>`);

			try {
				const file = this.app.vault.getAbstractFileByPath(this.inboxPath);
				if (file instanceof TFile) {
					await this.app.vault.append(file, lines.join('\n') + '\n');
				} else {
					await this.app.vault.create(this.inboxPath, lines.join('\n') + '\n');
				}
				new Notice('✨ Captured!');
				this.close();
			} catch (err) {
				new Notice("Error: " + String(err));
			}
		};

		submitBtn.addEventListener('click', () => { void doCapture(); });

		// Global keyboard
		this.scope.register([], 'Enter', () => {
			void doCapture();
			return false;
		});
		this.scope.register([], 'Escape', () => {
			this.close();
			return false;
		});
		// Alt+number for priority (avoids conflict with date input typing)
		for (const p of PRIOS) {
			this.scope.register(['Alt'], p.key, () => {
				this.selectedPrio = p.value;
				prioButtons.forEach((b) => {
					b.removeClass('active');
					if (b.getAttribute('data-value') === p.value) b.addClass('active');
				});
				return false;
			});
		}
	}

	onClose() {
		this.contentEl.empty();
	}
}
