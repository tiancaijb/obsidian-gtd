import { ItemView, WorkspaceLeaf, TFile, Notice, MarkdownView } from 'obsidian';
import { t, Lang } from '../utils/i18n';
import { parseTaskLines } from '../utils/parser';
import { ClockRecord, extractClockRecords, formatDuration as fmtClock } from '../utils/clock-parser';
import { formatDate, getWeekStart, getMonthPeriodStart } from '../utils/date-utils';

export const STATS_VIEW_TYPE = 'gtd-stats';

interface TaskStat {
	taskText: string;
	filePath: string;
	line: number;
	totalMin: number;
	sessions: number;
}

type PeriodKey = 'today' | 'yesterday' | 'thisWeek' | 'lastWeek' | 'thisMonth' | 'lastMonth';

const COLORS = [
	'#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#38d9a9',
	'#4dabf7', '#da77f2', '#f06595', '#20c997', '#748ffc',
	'#22b8cf', '#f783ac', '#ff8787', '#fcc419', '#339af0',
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
	private period: PeriodKey = 'today';

	constructor(leaf: WorkspaceLeaf, lang: Lang) {
		super(leaf);
		this.lang = lang;
	}

	getViewType(): string { return STATS_VIEW_TYPE; }
	getDisplayText(): string { return t('statsTitle', this.lang); }
	getIcon(): string { return 'bar-chart'; }

	async onOpen() {
		await this.loadData();
	}

	refresh() {
		void this.loadData();
	}

	updateSettings(lang: Lang) {
		this.lang = lang;
		void this.loadData();
	}

	/** Return [startDate, endDate] inclusive for the selected period */
	private getDateRange(): [Date, Date] {
		const today = new Date();
		today.setHours(0, 0, 0, 0);

		const weekStartDay = 1; // Monday
		const monthStartDay = 1;

		switch (this.period) {
			case 'today':
				return [new Date(today), new Date(today)];
			case 'yesterday': {
				const y = new Date(today);
				y.setDate(y.getDate() - 1);
				return [y, y];
			}
			case 'thisWeek': {
				const start = getWeekStart(today, weekStartDay);
				const end = new Date(start);
				end.setDate(end.getDate() + 6);
				return [start, end];
			}
			case 'lastWeek': {
				const start = getWeekStart(today, weekStartDay);
				start.setDate(start.getDate() - 7);
				const end = new Date(start);
				end.setDate(end.getDate() + 6);
				return [start, end];
			}
			case 'thisMonth': {
				const start = getMonthPeriodStart(today, monthStartDay);
				const end = new Date(start);
				end.setMonth(end.getMonth() + 1);
				end.setDate(monthStartDay - 1);
				return [start, end];
			}
			case 'lastMonth': {
				const start = getMonthPeriodStart(today, monthStartDay);
				start.setMonth(start.getMonth() - 1);
				const end = new Date(start);
				end.setMonth(end.getMonth() + 1);
				end.setDate(monthStartDay - 1);
				return [start, end];
			}
		}
	}

	/** Check if a ClockRecord falls within [start, end] (inclusive) */
	private recordInRange(rec: ClockRecord, start: Date, end: Date): boolean {
		const d = new Date(rec.start);
		d.setHours(0, 0, 0, 0);
		return d >= start && d <= end;
	}

	private formatRangeLabel(): string {
		const [s, e] = this.getDateRange();
		if (s.getTime() === e.getTime()) return formatDate(s);
		return formatDate(s) + ' ~ ' + formatDate(e);
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
		refreshBtn.addEventListener('click', () => { void this.loadData(); });

		// ── Period selector ──
		const periodRow = container.createDiv({ cls: 'gtd-stats-period-row' });

		const periods: { key: PeriodKey; labelKey: string }[] = [
			{ key: 'today', labelKey: 'periodToday' },
			{ key: 'yesterday', labelKey: 'periodYesterday' },
			{ key: 'thisWeek', labelKey: 'periodThisWeek' },
			{ key: 'lastWeek', labelKey: 'periodLastWeek' },
			{ key: 'thisMonth', labelKey: 'periodThisMonth' },
			{ key: 'lastMonth', labelKey: 'periodLastMonth' },
		];

		for (const p of periods) {
			const btn = periodRow.createEl('button', {
				cls: 'gtd-stats-period-btn' + (this.period === p.key ? ' active' : ''),
				text: t(p.labelKey, this.lang),
			});
			btn.addEventListener('click', () => {
				this.period = p.key;
				void this.loadData();
			});
		}

		// ── Date range label ──
		const rangeLabel = container.createDiv({ cls: 'gtd-stats-range' });
		rangeLabel.createEl('span', { text: this.formatRangeLabel() });

		// ── Scan all files for CLOCK records, filtered by period ──
		const [rangeStart, rangeEnd] = this.getDateRange();
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
					// Filter records by date range
					const filtered = taskRecords.filter(r => this.recordInRange(r, rangeStart, rangeEnd));
					if (filtered.length > 0) {
						const totalMin = filtered.reduce((s, r) => s + r.durationMin, 0);
						const existing = taskMap.get(task.text);
						if (existing) {
							existing.totalMin += totalMin;
							existing.sessions += filtered.length;
						} else {
							taskMap.set(task.text, {
								taskText: task.text,
								filePath: file.path,
								line: i,
								totalMin,
								sessions: filtered.length,
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

		// ── Grand total ──
		const totalBar = container.createDiv({ cls: 'gtd-stats-total' });
		totalBar.createEl('span', {
			text: t('totalTime', this.lang) + ': ' + fmtClock(grandTotal),
		});

		// ── Pie chart ──
		const SIZE = 160;
		const CX = SIZE / 2;
		const CY = SIZE / 2;
		const R = 68;

		// Build SVG arcs — accumulate angles
		let accAngle = -Math.PI / 2; // start from top

		const pieContainer = container.createDiv({ cls: 'gtd-stats-pie' });

		const svg = activeDocument.createElementNS('http://www.w3.org/2000/svg', 'svg');
		svg.setAttribute('width', String(SIZE));
		svg.setAttribute('height', String(SIZE));
		svg.setAttribute('viewBox', `0 0 ${SIZE} ${SIZE}`);
		pieContainer.appendChild(svg);

		const legend = pieContainer.createDiv({ cls: 'gtd-stats-legend' });

		for (let i = 0; i < sorted.length; i++) {
			const st = sorted[i]!;
			const pct = st.totalMin / grandTotal;
			const angle = pct * Math.PI * 2;
			const endAngle = accAngle + angle;
			const color = hashColor(st.taskText);

			if (angle > Math.PI * 2 - 0.001) {
				// Full circle (single task) — use <circle> element
				const circle = activeDocument.createElementNS('http://www.w3.org/2000/svg', 'circle');
				circle.setAttribute('cx', String(CX));
				circle.setAttribute('cy', String(CY));
				circle.setAttribute('r', String(R));
				circle.setAttribute('fill', color);
				circle.setAttribute('stroke', 'var(--background-primary)');
				circle.setAttribute('stroke-width', '1.5');
				svg.appendChild(circle);
			} else if (angle > 0.001) {
				const x1 = CX + R * Math.cos(accAngle);
				const y1 = CY + R * Math.sin(accAngle);
				const x2 = CX + R * Math.cos(endAngle);
				const y2 = CY + R * Math.sin(endAngle);
				const large = angle > Math.PI ? 1 : 0;
				const d = `M${CX},${CY} L${x1},${y1} A${R},${R} 0 ${large} 1 ${x2},${y2} Z`;

				const path = activeDocument.createElementNS('http://www.w3.org/2000/svg', 'path');
				path.setAttribute('d', d);
				path.setAttribute('fill', color);
				path.setAttribute('stroke', 'var(--background-primary)');
				path.setAttribute('stroke-width', '1.5');
				svg.appendChild(path);
			}

			accAngle = endAngle;

			// Legend row
			const lrow = legend.createDiv({ cls: 'gtd-stats-legend-row' });

			const dot = lrow.createEl('span', { cls: 'gtd-stats-dot' });
			dot.style.background = hashColor(st.taskText);

			lrow.createEl('span', { cls: 'gtd-stats-name', text: st.taskText });

			lrow.createEl('span', {
				cls: 'gtd-stats-dur',
				text: fmtClock(st.totalMin),
			});

			lrow.createEl('span', {
				cls: 'gtd-stats-pct',
				text: `${Math.round(pct * 100)}%`,
			});

			lrow.addEventListener('click',  () => {
				const file = this.app.vault.getAbstractFileByPath(st.filePath);
				if (file instanceof TFile) {
					const leaf = this.app.workspace.getLeaf(false);
					void leaf.openFile(file, { active: true });
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
				csv += String(st.sessions) + ',';
				csv += `${hours}h${mins}m,`;
				csv += String(st.totalMin) + ',';
				csv += String(pct) + '%\n';
			}
			const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
			const url = URL.createObjectURL(blob);
			const a = activeDocument.createElement('a');
			a.href = url;
			a.download = 'gtd-time-stats.csv';
			a.click();
			URL.revokeObjectURL(url);
			new Notice('CSV ' + t('downloaded', this.lang));
		});
	}
}
