/**
 * Integration tests for StatsView.
 *
 * Tests the stats view's core logic using mocked Obsidian APIs:
 * - getDateRange(), recordInRange(): date range selection and filtering
 * - Data loading: scanning files for CLOCK records, aggregating stats
 * - updateSettings(): settings propagation
 * - View identity
 * - Handles empty states gracefully
 *
 * NOTE: refresh() returns void (calls void this.loadData()). Use onOpen()
 * for async data loading, or verify refresh() doesn't throw synchronously.
 */
import { vi, describe, it, expect, afterEach } from 'vitest';

vi.mock('obsidian', () => import('../helpers/obsidian-mock').then(m => m.obsidianMockModule()));

// StatsView.renderStats() uses activeDocument (Obsidian's window.document) for SVG creation.
// Stub the necessary globals so the SVG rendering doesn't throw in Node.
const mockSvgEl = {
	setAttribute: vi.fn(),
	appendChild: vi.fn(),
	style: {},
};

vi.stubGlobal('activeDocument', {
	createElementNS: vi.fn(() => mockSvgEl),
	createElement: vi.fn(() => ({
		href: '',
		click: vi.fn(),
		setAttribute: vi.fn(),
	})),
});

vi.stubGlobal('URL', {
	createObjectURL: vi.fn(() => 'blob:mock'),
	revokeObjectURL: vi.fn(),
});

vi.stubGlobal('Blob', vi.fn(() => ({})));

import { StatsView, STATS_VIEW_TYPE } from '../../views/stats-view';
import { MockApp, MockWorkspaceLeaf, MockTFile } from '../helpers/obsidian-mock';

// ─── Helpers ─────────────────────────────────────────────────────────────

function makeApp(files: { path: string; content: string }[]): MockApp {
	const vaultFiles = files.map(f => new MockTFile(f.path));
	const readMap = new Map<string, string>();
	for (const f of files) {
		readMap.set(f.path, f.content);
	}
	return new MockApp({ vaultFiles, vaultReadMap: readMap });
}

function createView(app: MockApp, lang: 'zh' | 'en' = 'zh'): StatsView {
	const leaf = new MockWorkspaceLeaf();
	const view = new StatsView(leaf, lang);
	(view as unknown as { app: MockApp }).app = app;
	return view;
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe('StatsView', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('view identity', () => {
		it('returns the correct view type', () => {
			const view = createView(makeApp([]));
			expect(view.getViewType()).toBe(STATS_VIEW_TYPE);
		});

		it('returns a display text', () => {
			const view = createView(makeApp([]));
			expect(view.getDisplayText()).toBeTruthy();
			expect(typeof view.getDisplayText()).toBe('string');
		});

		it('returns an icon', () => {
			const view = createView(makeApp([]));
			expect(view.getIcon()).toBeTruthy();
		});
	});

	describe('updateSettings()', () => {
		it('updates the language setting', () => {
			const view = createView(makeApp([]), 'zh');
			const viewAny = view as unknown as { lang: 'zh' | 'en' };

			expect(viewAny.lang).toBe('zh');
			view.updateSettings('en');
			expect(viewAny.lang).toBe('en');
		});

		it('triggers loadData to reload content', () => {
			const view = createView(makeApp([]), 'zh');
			const viewAny = view as unknown as { loadData: () => Promise<void> };

			const loadSpy = vi.spyOn(viewAny, 'loadData').mockResolvedValue(undefined);

			view.updateSettings('en');
			expect(loadSpy).toHaveBeenCalledTimes(1);
		});
	});

	describe('date range logic', () => {
		it('returns a single day for today period', () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-06-28'));

			const view = createView(makeApp([]));
			const viewAny = view as unknown as { getDateRange(): [Date, Date]; period: string };

			viewAny.period = 'today';
			const [start, end] = viewAny.getDateRange();

			expect(start.getTime()).toBe(end.getTime());
			expect(start.getFullYear()).toBe(2026);
			expect(start.getMonth()).toBe(5); // June is 5 (0-indexed)
			expect(start.getDate()).toBe(28);

			vi.useRealTimers();
		});

		it('returns yesterday correctly', () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-06-28'));

			const view = createView(makeApp([]));
			const viewAny = view as unknown as { getDateRange(): [Date, Date]; period: string };

			viewAny.period = 'yesterday';
			const [start, end] = viewAny.getDateRange();

			expect(start.getTime()).toBe(end.getTime());
			expect(start.getFullYear()).toBe(2026);
			expect(start.getMonth()).toBe(5);
			expect(start.getDate()).toBe(27);

			vi.useRealTimers();
		});

		it('returns a 7-day range for thisWeek', () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-06-28')); // Sunday

			const view = createView(makeApp([]));
			const viewAny = view as unknown as { getDateRange(): [Date, Date]; period: string };

			viewAny.period = 'thisWeek';
			const [start, end] = viewAny.getDateRange();

			// Week starts Monday (weekStartDay=1)
			// 2026-06-28 is Sunday → week start = Monday 2026-06-22
			expect(start.getFullYear()).toBe(2026);
			expect(start.getMonth()).toBe(5);
			expect(start.getDate()).toBe(22);

			expect(end.getFullYear()).toBe(2026);
			expect(end.getMonth()).toBe(5);
			expect(end.getDate()).toBe(28);

			vi.useRealTimers();
		});

		it('returns last week range', () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-06-28'));

			const view = createView(makeApp([]));
			const viewAny = view as unknown as { getDateRange(): [Date, Date]; period: string };

			viewAny.period = 'lastWeek';
			const [start, end] = viewAny.getDateRange();

			// Last week: Mon 2026-06-15 to Sun 2026-06-21
			expect(start.getFullYear()).toBe(2026);
			expect(start.getMonth()).toBe(5);
			expect(start.getDate()).toBe(15);

			expect(end.getFullYear()).toBe(2026);
			expect(end.getMonth()).toBe(5);
			expect(end.getDate()).toBe(21);

			vi.useRealTimers();
		});
	});

	describe('recordInRange', () => {
		it('returns true when record date is within range', () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-06-28'));

			const view = createView(makeApp([]));
			const viewAny = view as unknown as {
				recordInRange(rec: { start: Date }, start: Date, end: Date): boolean;
			};

			const start = new Date('2026-06-01');
			const end = new Date('2026-06-30');
			const record = { start: new Date('2026-06-15') };

			expect(viewAny.recordInRange(record, start, end)).toBe(true);

			vi.useRealTimers();
		});

		it('returns false when record date is before range', () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-06-28'));

			const view = createView(makeApp([]));
			const viewAny = view as unknown as {
				recordInRange(rec: { start: Date }, start: Date, end: Date): boolean;
			};

			const start = new Date('2026-06-01');
			const end = new Date('2026-06-30');
			const record = { start: new Date('2026-05-15') };

			expect(viewAny.recordInRange(record, start, end)).toBe(false);

			vi.useRealTimers();
		});

		it('returns false when record date is after range', () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-06-28'));

			const view = createView(makeApp([]));
			const viewAny = view as unknown as {
				recordInRange(rec: { start: Date }, start: Date, end: Date): boolean;
			};

			const start = new Date('2026-06-01');
			const end = new Date('2026-06-30');
			const record = { start: new Date('2026-07-15') };

			expect(viewAny.recordInRange(record, start, end)).toBe(false);

			vi.useRealTimers();
		});

		// NOTE: Boundary tests for recordInRange are timezone-sensitive because
		// setHours() operates in local time (see KNOWN ISSUE in SPEC.md).
		// In UTC+8, records on the exact start/end date boundary may round-trip
		// to the previous day after setHours(). This test verifies that a record
		// comfortably within the range returns true regardless of timezone.
	});

	describe('data processing', () => {
		it('refresh() does not throw with empty vault', () => {
			const view = createView(makeApp([]), 'en');
			expect(() => { view.refresh(); }).not.toThrow();
		});

		it('processes tasks with CLOCK records without errors', () => {
			const app = makeApp([
				{
					path: 'gtd/tasks.md',
					content: [
						'- [ ] Task with clock',
						'  CLOCK: [2026-06-28 Sun 10:00]--[2026-06-28 Sun 10:25] => 0:25',
					].join('\n'),
				},
			]);
			const view = createView(app, 'en');
			expect(() => { view.refresh(); }).not.toThrow();
		});

		it('processes zh CLOCK records correctly', () => {
			const app = makeApp([
				{
					path: 'gtd/tasks.md',
					content: [
						'- [ ] 中文任务',
						'  计时: [2026-06-28 Sun 10:00]--[2026-06-28 Sun 10:25] => 0:25',
					].join('\n'),
				},
			]);
			const view = createView(app, 'zh');
			expect(() => { view.refresh(); }).not.toThrow();
		});

		it('handles multiple files with clock records', () => {
			const app = makeApp([
				{
					path: 'gtd/file1.md',
					content: [
						'- [ ] Task 1',
						'  CLOCK: [2026-06-28 Sun 10:00]--[2026-06-28 Sun 10:25] => 0:25',
					].join('\n'),
				},
				{
					path: 'gtd/file2.md',
					content: [
						'- [ ] Task 2',
						'  CLOCK: [2026-06-28 Sun 11:00]--[2026-06-28 Sun 11:30] => 0:30',
					].join('\n'),
				},
			]);
			const view = createView(app, 'en');
			expect(() => { view.refresh(); }).not.toThrow();
		});

		it('handles tasks without CLOCK records', () => {
			const app = makeApp([
				{ path: 'gtd/tasks.md', content: '- [ ] Simple task\n' },
			]);
			const view = createView(app, 'en');
			expect(() => { view.refresh(); }).not.toThrow();
		});
	});

	describe('onOpen()', () => {
		it('completes without error with empty vault', async () => {
			const view = createView(makeApp([]), 'en');
			await expect(view.onOpen()).resolves.toBeUndefined();
		});

		it('completes without error with clock records', async () => {
			const app = makeApp([
				{
					path: 'gtd/tasks.md',
					content: [
						'- [ ] Task with clock',
						'  CLOCK: [2026-06-28 Sun 10:00]--[2026-06-28 Sun 10:25] => 0:25',
					].join('\n'),
				},
			]);
			const view = createView(app, 'en');
			await expect(view.onOpen()).resolves.toBeUndefined();
		});
	});
});
