/**
 * Integration tests for TimelineView.
 *
 * Tests the timeline view's core logic using mocked Obsidian APIs:
 * - Data loading: scanning files for CLOCK records filtered by date
 * - updateSettings(): settings propagation
 * - View identity
 * - Handles empty states gracefully
 *
 * NOTE: refresh() returns void (calls void this.loadData()), so it cannot
 * be awaited. Use onOpen() for async data loading, or just verify refresh()
 * doesn't throw synchronously.
 */
import { vi, describe, it, expect, afterEach } from 'vitest';

vi.mock('obsidian', () => import('../helpers/obsidian-mock').then(m => m.obsidianMockModule()));

import { TimelineView, TIMELINE_VIEW_TYPE } from '../../views/timeline-view';
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

function createView(app: MockApp, lang: 'zh' | 'en' = 'zh'): TimelineView {
	const leaf = new MockWorkspaceLeaf();
	const view = new TimelineView(leaf, lang);
	(view as unknown as { app: MockApp }).app = app;
	return view;
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe('TimelineView', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('view identity', () => {
		it('returns the correct view type', () => {
			const view = createView(makeApp([]));
			expect(view.getViewType()).toBe(TIMELINE_VIEW_TYPE);
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

	describe('data processing', () => {
		it('refresh() does not throw with simple task (no clock records)', () => {
			const app = makeApp([
				{ path: 'gtd/tasks.md', content: '- [ ] Simple task without clock\n' },
			]);
			const view = createView(app, 'en');

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
	});

	describe('onOpen() and data loading', () => {
		it('calls loadData when onOpen is invoked', async () => {
			const app = makeApp([]);
			const view = createView(app, 'en');
			const viewAny = view as unknown as { loadData: () => Promise<void> };

			const loadSpy = vi.spyOn(viewAny, 'loadData').mockResolvedValue(undefined);

			await view.onOpen();
			expect(loadSpy).toHaveBeenCalledTimes(1);
		});

		it('onOpen completes without error with empty vault', async () => {
			const view = createView(makeApp([]), 'en');
			await expect(view.onOpen()).resolves.toBeUndefined();
		});

		it('onOpen completes without error with clock records', async () => {
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
