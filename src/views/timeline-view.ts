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
		await this.loadData();
	}

	refresh() {
		void this.loadData();
	}

	updateSettings(lang: Lang) {
		this.lang = lang;
		void this.loadData();
	}

	private async loadData() {
		const container = this.containerEl.children[1] as HTMLElement;
		container.empty();
		container.className = 'gtd-timeline-container';

		// ── Toolbar ──
		const toolbar = container.createDiv({ cls: 'gtd-timeline-toolbar' });
		const prevBtn = toolbar.createEl('button', { text: '‹', cls: 'gtd-timeline-nav' });
		const nextBtn = toolbar.createEl('button', { text: '›', cls: 'gtd-timeline-nav' });
		const todayBtn = toolbar.createEl('button', { text: t('today', this.lang), cls: 'gtd-timeline-today-btn' });

		prevBtn.addEventListener('click', () => {
			const d = new Date(this.dateStr);
			d.setDate(d.getDate() - 1);
			this.dateStr = formatDate(d);
			void this.loadData();
		});
		nextBtn.addEventListener('click', () => {
			const d = new Date(this.dateStr);
			d.setDate(d.getDate() + 1);
			this.dateStr = formatDate(d);
			void this.loadData();
		});
		todayBtn.addEventListener('click', () => {
			this.dateStr = todayStr();
			void this.loadData();
		});

		// ── Scan files with heading hierarchy ──
		const entries: ClockWithTask[] = [];
		for (const file of this.app.vault.getMarkdownFiles()) {
			const content = await this.app.vault.read(file);
			const lines = content.split('\n');

			// Track heading stack for parent context
			const headingStack: string[] = [];
			let i = 0;
			while (i < lines.length) {
				const line = lines[i]!;
				const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
				if (headingMatch) {
					const level = headingMatch[1]!.length;
					// Clean heading: remove links [[...]] → keep text
					const headingText = headingMatch[2]!.replace(/\[\[([^\]|]+)\|?\]\]/g, '$1').replace(/\[\[([^\]]+)\]\]/g, '$1');
					// Pop stack to matching level
					while (headingStack.length >= level) { headingStack.pop(); }
					headingStack.push(headingText);
				}

				const task = parseTaskLines(lines, i);
				if (task) {
					const pathPrefix = headingStack.length > 0 ? headingStack.join(' > ') + ' > ' : '';
					for (let j = i + 1; j < lines.length && j <= i + task.metaLineCount + 10; j++) {
						const recs = extractClockRecords([lines[j]!]);
						const dayRecs = filterByDate(recs, this.dateStr);
						for (const rec of dayRecs) {
							entries.push({ record: rec, taskText: pathPrefix + task.text, filePath: file.path });
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

		}

		// ── Blocks (positioned absolutely within timeline) ──

		// We use a wrapper inside timeline for absolute positioning
		const track = timeline.createDiv({ cls: 'gtd-timeline-track' });
		// track styling via CSS class
		// track styling via CSS class
		// track styling via CSS class
		// track styling via CSS class
		// track styling via CSS class
		// track styling via CSS class

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

			const label = block.createEl('span', { cls: 'gtd-timeline-block-label' });
			label.textContent = fmtClock(entry.record.durationMin) + '  ' + entry.taskText;

			block.addEventListener('click', () => {
				const file = this.app.vault.getAbstractFileByPath(entry.filePath);
				if (file instanceof TFile) {
					void this.app.workspace.getLeaf(false).openFile(file);
				}
			});
		}
	}
}
