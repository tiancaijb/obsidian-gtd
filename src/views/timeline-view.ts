import { ItemView, WorkspaceLeaf, TFile } from 'obsidian';
import { t, Lang } from '../utils/i18n';
import { todayStr, formatDate } from '../utils/date-utils';
import { parseTaskLines } from '../utils/parser';
import { ClockRecord, extractClockRecords, filterByDate, formatDuration as fmtClock } from '../utils/clock-parser';

export const TIMELINE_VIEW_TYPE = 'gtd-timeline';

interface ClockWithTask {
	record: ClockRecord;
	taskText: string;
	filePath: string;
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

export class TimelineView extends ItemView {
	private lang: Lang;
	private dateStr: string;

	constructor(leaf: WorkspaceLeaf, lang: Lang) {
		super(leaf);
		this.lang = lang;
		this.dateStr = todayStr();
	}

	getViewType(): string { return TIMELINE_VIEW_TYPE; }
	getDisplayText(): string { return t('timelineTitle', this.lang); }
	getIcon(): string { return 'clock'; }

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
		container.className = 'gtd-timeline-container';

		// ── Toolbar ──
		const toolbar = container.createDiv({ cls: 'gtd-timeline-toolbar' });
		const prevBtn = toolbar.createEl('button', { text: '‹', cls: 'gtd-timeline-nav' });
		const dateLabel = toolbar.createEl('span', { text: this.dateStr, cls: 'gtd-timeline-date-label' });
		const nextBtn = toolbar.createEl('button', { text: '›', cls: 'gtd-timeline-nav' });
		const todayBtn = toolbar.createEl('button', { text: t('today', this.lang), cls: 'gtd-timeline-today-btn' });

		prevBtn.addEventListener('click', () => {
			const d = new Date(this.dateStr);
			d.setDate(d.getDate() - 1);
			this.dateStr = formatDate(d);
			this.loadData();
		});
		nextBtn.addEventListener('click', () => {
			const d = new Date(this.dateStr);
			d.setDate(d.getDate() + 1);
			this.dateStr = formatDate(d);
			this.loadData();
		});
		todayBtn.addEventListener('click', () => {
			this.dateStr = todayStr();
			this.loadData();
		});

		// ── Scan files ──
		const entries: ClockWithTask[] = [];
		for (const file of this.app.vault.getMarkdownFiles()) {
			const content = await this.app.vault.read(file);
			const lines = content.split('\n');

			let i = 0;
			while (i < lines.length) {
				const task = parseTaskLines(lines, i);
				if (task) {
					for (let j = i + 1; j < lines.length && j <= i + task.metaLineCount + 10; j++) {
						const recs = extractClockRecords([lines[j]!]);
						const dayRecs = filterByDate(recs, this.dateStr);
						for (const rec of dayRecs) {
							entries.push({ record: rec, taskText: task.text, filePath: file.path });
						}
					}
					i += task.metaLineCount + 1;
				} else {
					i++;
				}
			}
		}

		this.renderTimeline(container, entries);
	}

	private renderTimeline(container: HTMLElement, entries: ClockWithTask[]) {
		if (entries.length === 0) {
			container.createEl('p', { text: t('noClockRecords', this.lang), cls: 'gtd-timeline-empty' });
			return;
		}

		entries.sort((a, b) => a.record.start.getTime() - b.record.start.getTime());

		const totalMin = entries.reduce((s, e) => s + e.record.durationMin, 0);

		// ── Legend ──
		const seen = new Set<string>();
		const legend = container.createDiv({ cls: 'gtd-timeline-legend' });
		for (const e of entries) {
			if (seen.has(e.taskText)) continue;
			seen.add(e.taskText);
			const item = legend.createDiv({ cls: 'gtd-timeline-legend-item' });
			const swatch = item.createEl('span', { cls: 'gtd-timeline-swatch' });
			swatch.style.background = hashColor(e.taskText);
			item.createEl('span', { text: e.taskText });
		}

		// ── Summary bar ──
		const summary = container.createDiv({ cls: 'gtd-timeline-summary' });
		summary.createEl('span', { text: '⏱ ' + t('totalTime', this.lang) + ': ' + fmtClock(totalMin) });

		// ── Timeline ──
		const PX_PER_HOUR = 42;
		const START_HOUR = 6;
		const END_HOUR = 23;

		const timeline = container.createDiv({ cls: 'gtd-timeline-body' });

		// Hour rows (grid)
		for (let h = START_HOUR; h <= END_HOUR; h++) {
			const row = timeline.createDiv({ cls: 'gtd-timeline-hour-row' });
			row.style.height = PX_PER_HOUR + 'px';

			const label = row.createEl('span', { cls: 'gtd-timeline-hour-label' });
			const ampm = h < 12 ? 'AM' : 'PM';
			const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
			label.textContent = displayH + ampm;

			const gridline = row.createEl('span', { cls: 'gtd-timeline-gridline' });
		}

		// ── Blocks (positioned absolutely within timeline) ──
		const maxMin = Math.max(...entries.map((e) => e.record.durationMin), 1);

		// We use a wrapper inside timeline for absolute positioning
		const track = timeline.createDiv({ cls: 'gtd-timeline-track' });
		track.style.position = 'absolute';
		track.style.top = '0';
		track.style.left = '0';
		track.style.right = '0';
		track.style.bottom = '0';
		track.style.pointerEvents = 'none';

		for (const entry of entries) {
			const startH = entry.record.start.getHours() + entry.record.start.getMinutes() / 60;
			const endH = entry.record.end.getHours() + entry.record.end.getMinutes() / 60;
			const durationH = Math.max(0.25, endH - startH); // at least 15min visual

			if (endH < START_HOUR || startH > END_HOUR) continue;

			const topPx = (Math.max(startH, START_HOUR) - START_HOUR) * PX_PER_HOUR;
			const heightPx = Math.max(8, durationH * PX_PER_HOUR);

			const block = track.createDiv({ cls: 'gtd-timeline-block' });
			block.style.top = topPx + 'px';
			block.style.height = heightPx + 'px';
			block.style.background = hashColor(entry.taskText);
			block.style.pointerEvents = 'auto';

			const label = block.createEl('span', { cls: 'gtd-timeline-block-label' });
			label.textContent = fmtClock(entry.record.durationMin) + '  ' + entry.taskText;

			block.addEventListener('click', () => {
				const file = this.app.vault.getAbstractFileByPath(entry.filePath);
				if (file instanceof TFile) {
					this.app.workspace.getLeaf(false).openFile(file);
				}
			});
		}
	}
}
