import { ItemView, WorkspaceLeaf, TFile, Notice, MarkdownView } from 'obsidian';
import { t, Lang } from '../utils/i18n';
import { parseTaskLines } from '../utils/parser';
import { ClockRecord, extractClockRecords, totalMinutes, formatDuration as fmtClock } from '../utils/clock-parser';

export const STATS_VIEW_TYPE = 'gtd-stats';

interface TaskStat {
	taskText: string;
	filePath: string;
	line: number;
	totalMin: number;
	sessions: number;
}

const COLORS = [
	'#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c',
	'#3498db', '#9b59b6', '#e84393', '#00b894', '#6c5ce7',
	'#00cec9', '#fd79a8', '#d63031', '#e17055', '#0984e3',
];

function hashColor(key: string): string {
	let hash = 0;
	for (let i = 0; i < key.length; i++) {
		hash = key.charCodeAt(i) + (hash << 5) - hash;
	}
	return COLORS[Math.abs(hash) % COLORS.length]!;
}

export class StatsView extends ItemView {
	private lang: Lang;

	constructor(leaf: WorkspaceLeaf, lang: Lang) {
		super(leaf);
		this.lang = lang;
	}

	getViewType(): string { return STATS_VIEW_TYPE; }
	getDisplayText(): string { return t('statsTitle', this.lang); }
	getIcon(): string { return 'bar-chart'; }

	async onOpen() {
		this.loadData();
	}

	async refresh() {
		this.loadData();
	}

	updateSettings(lang: Lang) {
		this.lang = lang;
		this.loadData();
	}

	private async loadData() {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		container.className = 'gtd-stats-container';

		// ── Header ──
		const header = container.createDiv({ cls: 'gtd-stats-header' });
		header.createEl('h3', { text: t('statsTitle', this.lang) });
		const refreshBtn = header.createEl('button', {
			text: '↻',
			cls: 'gtd-stats-refresh',
		});
		refreshBtn.addEventListener('click', () => this.loadData());

		// ── Scan all files for CLOCK records ──
		const taskMap = new Map<string, TaskStat>();

		for (const file of this.app.vault.getMarkdownFiles()) {
			const content = await this.app.vault.read(file);
			const lines = content.split('\n');

			let i = 0;
			while (i < lines.length) {
				const task = parseTaskLines(lines, i);
				if (task) {
					const taskRecords: ClockRecord[] = [];
					for (let j = i + 1; j < lines.length && j <= i + task.metaLineCount + 10; j++) {
						const recs = extractClockRecords([lines[j]!]);
						taskRecords.push(...recs);
					}
					if (taskRecords.length > 0) {
						const totalMin = taskRecords.reduce((s, r) => s + r.durationMin, 0);
						const existing = taskMap.get(task.text);
						if (existing) {
							existing.totalMin += totalMin;
							existing.sessions += taskRecords.length;
						} else {
							taskMap.set(task.text, {
								taskText: task.text,
								filePath: file.path,
								line: i,
								totalMin,
								sessions: taskRecords.length,
							});
						}
					}
					i += task.metaLineCount + 1;
				} else {
					i++;
				}
			}
		}

		this.renderStats(container, taskMap);
	}

	private renderStats(container: HTMLElement, taskMap: Map<string, TaskStat>) {
		if (taskMap.size === 0) {
			container.createEl('p', {
				text: t('noClockRecords', this.lang),
				cls: 'gtd-stats-empty',
			});
			return;
		}

		const sorted = [...taskMap.values()].sort((a, b) => b.totalMin - a.totalMin);
		const grandTotal = sorted.reduce((s, t) => s + t.totalMin, 0);
		const maxTaskMin = sorted[0]!.totalMin;

		// ── Grand total ──
		const totalBar = container.createDiv({ cls: 'gtd-stats-total' });
		totalBar.createEl('span', {
			text: t('totalTime', this.lang) + ': ' + fmtClock(grandTotal),
		});

		// ── Per-task list ──
		const list = container.createDiv({ cls: 'gtd-stats-list' });

		for (const st of sorted) {
			const pct = Math.round((st.totalMin / grandTotal) * 100);
			const barW = Math.max(3, (st.totalMin / maxTaskMin) * 100);
			const color = hashColor(st.taskText);

			const row = list.createDiv({ cls: 'gtd-stats-row' });
			row.style.display = 'flex';
			row.style.alignItems = 'center';
			row.style.gap = '8px';
			row.style.padding = '8px 0';
			row.style.borderBottom = '1px solid var(--background-modifier-border)';
			row.style.cursor = 'pointer';
			row.style.transition = 'background 0.12s';

			// Color dot
			const dot = row.createEl('span');
			dot.style.width = '10px';
			dot.style.height = '10px';
			dot.style.borderRadius = '50%';
			dot.style.background = color;
			dot.style.flexShrink = '0';

			// Left column: task name + metadata
			const infoCol = row.createDiv();
			infoCol.style.flex = '1';
			infoCol.style.minWidth = '0';
			infoCol.style.overflow = 'hidden';

			const nameEl = infoCol.createEl('span', { text: st.taskText });
			nameEl.style.display = 'block';
			nameEl.style.fontSize = '13px';
			nameEl.style.fontWeight = '600';
			nameEl.style.overflow = 'hidden';
			nameEl.style.textOverflow = 'ellipsis';
			nameEl.style.whiteSpace = 'nowrap';

			const metaEl = infoCol.createEl('span', {
				text: st.sessions + ' ' + t('sessions', this.lang),
			});
			metaEl.style.fontSize = '10px';
			metaEl.style.color = 'var(--text-muted)';

			// Right column: duration + pct + bar
			const rightCol = row.createDiv();
			rightCol.style.display = 'flex';
			rightCol.style.alignItems = 'center';
			rightCol.style.gap = '6px';
			rightCol.style.flexShrink = '0';

			const durEl = rightCol.createEl('span', {
				text: fmtClock(st.totalMin),
			});
			durEl.style.fontSize = '13px';
			durEl.style.fontWeight = '700';
			durEl.style.fontFamily = 'monospace';
			durEl.style.minWidth = '50px';
			durEl.style.textAlign = 'right';

			const pctEl = rightCol.createEl('span', {
				text: pct + '%',
			});
			pctEl.style.fontSize = '11px';
			pctEl.style.color = 'var(--text-muted)';
			pctEl.style.minWidth = '32px';
			pctEl.style.textAlign = 'right';

			const barOuter = rightCol.createEl('span');
			barOuter.style.flex = '0 0 50px';
			barOuter.style.height = '8px';
			barOuter.style.background = 'var(--background-modifier-border)';
			barOuter.style.borderRadius = '4px';
			barOuter.style.overflow = 'hidden';

			const barInner = barOuter.createEl('span');
			barInner.style.display = 'block';
			barInner.style.height = '100%';
			barInner.style.width = barW + '%';
			barInner.style.background = color;
			barInner.style.borderRadius = '4px';
			barInner.style.opacity = '0.7';

			// Click handler — open file and scroll to task line
			row.addEventListener('click', async () => {
				const file = this.app.vault.getAbstractFileByPath(st.filePath);
				if (file instanceof TFile) {
					const leaf = this.app.workspace.getLeaf(false);
					await leaf.openFile(file, { active: true });
					const view = leaf.view;
					if (view instanceof MarkdownView) {
						view.editor.setCursor(st.line, 0);
						view.editor.scrollIntoView({ from: { line: st.line, ch: 0 }, to: { line: st.line, ch: 0 } }, true);
					}
				} else {
					new Notice('File not found: ' + st.filePath);
				}
			});
		}

		// ── Export CSV ──
		const exportRow = container.createDiv({ cls: 'gtd-stats-export' });
		exportRow.style.marginTop = '16px';
		exportRow.style.textAlign = 'center';

		const csvBtn = exportRow.createEl('button', {
			text: t('exportCsv', this.lang),
			cls: 'mod-cta',
		});
		csvBtn.addEventListener('click', () => {
			let csv = t('csvHeaders', this.lang) + '\n';
			for (const st of sorted) {
				const hours = Math.floor(st.totalMin / 60);
				const mins = st.totalMin % 60;
				const pct = Math.round((st.totalMin / grandTotal) * 100);
				csv += '"' + st.taskText.replace(/"/g, '""') + '",';
				csv += st.sessions + ',';
				csv += hours + 'h' + mins + 'm,';
				csv += st.totalMin + ',';
				csv += pct + '%\n';
			}
			const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = 'gtd-time-stats.csv';
			a.style.display = 'none';
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			new Notice('CSV ' + t('downloaded', this.lang));
		});
	}
}
