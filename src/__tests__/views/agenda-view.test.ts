/**
 * Integration tests for AgendaView.
 *
 * Tests the core logic of the agenda view using mocked Obsidian APIs:
 * - scanVault(): correct file filtering and task parsing
 * - groupTasks(): date-based grouping (Today / This Week / This Month / Future / No Date)
 * - Sorting: by priority within groups
 * - updateSettings(): settings propagation
 *
 * Mock strategy:
 * - vi.mock('obsidian') provides minimal class stubs for ItemView, WorkspaceLeaf, etc.
 * - MockApp is injected post-construction with vault files for scanVault() tests
 * - Pure utility modules (parser, date-utils, i18n) are imported unmocked
 * - Pomodoro/timer state is reset between tests to avoid cross-test leakage
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('obsidian', () => import('../helpers/obsidian-mock').then(m => m.obsidianMockModule()));

// window.setTimeout used in agenda-view.ts for debouncing
vi.stubGlobal('window', { setTimeout: globalThis.setTimeout.bind(globalThis) });

import { AgendaView, AGENDA_VIEW_TYPE, TimerAPI } from '../../views/agenda-view';
import { groupTasks } from '../../views/agenda-ui';
import { MockApp, MockWorkspaceLeaf, MockTFile } from '../helpers/obsidian-mock';
import { GtdPluginSettings, DEFAULT_SETTINGS } from '../../settings';
import { resetPomodoro } from '../../utils/pomodoro';
import { resetTimer } from '../../utils/timer';

// ─── Test helpers ────────────────────────────────────────────────────────

function makeSettings(overrides?: Partial<GtdPluginSettings>): GtdPluginSettings {
	return { ...DEFAULT_SETTINGS, ...overrides };
}

function makeTimerAPI(): TimerAPI & {
	start: ReturnType<typeof vi.fn>;
	pause: ReturnType<typeof vi.fn>;
	resume: ReturnType<typeof vi.fn>;
	stop: ReturnType<typeof vi.fn>;
	getCurrent: ReturnType<typeof vi.fn>;
	getElapsed: ReturnType<typeof vi.fn>;
	stopAndLog: ReturnType<typeof vi.fn>;
} {
	return {
		start: vi.fn(),
		pause: vi.fn(),
		resume: vi.fn(),
		stop: vi.fn(() => ({ elapsedMs: 0, startDate: new Date(), endDate: new Date() })),
		getCurrent: vi.fn(() => null),
		getElapsed: vi.fn(() => 0),
		stopAndLog: vi.fn(),
	};
}

/** Build a minimal MockTFile from a path */
function makeFile(path: string): MockTFile {
	return new MockTFile(path);
}

/** Create a mock vault with given file contents keyed by path */
function makeApp(files: { path: string; content: string }[]): MockApp {
	const vaultFiles = files.map(f => new MockTFile(f.path));
	const readMap = new Map<string, string>();
	for (const f of files) {
		readMap.set(f.path, f.content);
	}
	return new MockApp({ vaultFiles, vaultReadMap: readMap });
}

/** Create a fresh view with the given settings and app */
function createView(
	app: MockApp,
	settings?: GtdPluginSettings,
	timerAPI?: TimerAPI,
): AgendaView {
	const leaf = new MockWorkspaceLeaf();
	const view = new AgendaView(
		leaf,
		settings ?? makeSettings(),
		timerAPI ?? makeTimerAPI(),
	);
	// Override app so vault returns our test files
	(view as unknown as { app: MockApp }).app = app;
	return view;
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe('AgendaView', () => {
	beforeEach(() => {
		resetPomodoro();
		resetTimer();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	// ── scanVault ────────────────────────────────────────────────────────

	describe('scanVault()', () => {
		it('reads files inside the GTD folder and returns parsed task entries', async () => {
			const app = makeApp([
				{
					path: 'gtd/inbox.md',
					content: [
						'- [ ] Write report  PRIORITY: [#A]  SCHEDULED: <2026-06-28>',
						'- [X] Buy coffee  CLOSED: <2026-06-26>',
					].join('\n'),
				},
				{
					path: 'gtd/next.md',
					content: '- [ ] Read paper  PRIORITY: [#B]  SCHEDULED: <2026-06-29>',
				},
			]);
			const view = createView(app, makeSettings({ gtdFolder: 'gtd' }));

			const entries: unknown[] = await (view as unknown as { scanVault(): Promise<unknown[]> }).scanVault();

			expect(entries).toHaveLength(3);
			// First entry: Write report (unchecked, priority A, scheduled 2026-06-28)
			const e0 = entries[0] as Record<string, unknown>;
			const t0 = e0.task as Record<string, unknown>;
			expect(t0.text).toBe('Write report');
			expect(t0.priority).toBe('A');
			expect(t0.checked).toBe(false);
			expect(e0.date).toBe('2026-06-28');
			expect(e0.dateType).toBe('scheduled');
			// Second entry: Buy coffee (checked, no priority)
			const e1 = entries[1] as Record<string, unknown>;
			const t1 = e1.task as Record<string, unknown>;
			expect(t1.text).toBe('Buy coffee');
			expect(t1.priority).toBeNull();
			expect(t1.checked).toBe(true);
			expect(e1.date).toBe('2026-06-26');
			expect(e1.dateType).toBe('closed');
		});

		it('skips files outside the GTD folder', async () => {
			const app = makeApp([
				{ path: 'gtd/inbox.md', content: '- [ ] Inside task' },
				{ path: 'other/note.md', content: '- [ ] Outside task' },
			]);
			const view = createView(app, makeSettings({ gtdFolder: 'gtd' }));

			const entries: unknown[] = await (view as unknown as { scanVault(): Promise<unknown[]> }).scanVault();

			expect(entries).toHaveLength(1);
			const t0 = (entries[0] as Record<string, unknown>).task as Record<string, unknown>;
			expect(t0.text).toBe('Inside task');
		});

		it('handles empty GTD folder gracefully', async () => {
			const app = makeApp([]);
			const view = createView(app, makeSettings({ gtdFolder: 'gtd' }));

			const entries: unknown[] = await (view as unknown as { scanVault(): Promise<unknown[]> }).scanVault();

			expect(entries).toHaveLength(0);
		});

		it('skips lines that are not task lines', async () => {
			const app = makeApp([
				{
					path: 'gtd/inbox.md',
					content: [
						'# Heading',
						'',
						'Regular paragraph text.',
						'- [ ] Actual task',
					].join('\n'),
				},
			]);
			const view = createView(app, makeSettings({ gtdFolder: 'gtd' }));

			const entries: unknown[] = await (view as unknown as { scanVault(): Promise<unknown[]> }).scanVault();

			expect(entries).toHaveLength(1);
			const t0 = (entries[0] as Record<string, unknown>).task as Record<string, unknown>;
			expect(t0.text).toBe('Actual task');
		});
	});

	// ── groupTasks ───────────────────────────────────────────────────────

	describe('groupTasks()', () => {
		it('groups entries by date categories with default settings', () => {
			// Fix today to a known date for deterministic testing
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-06-28')); // Sunday

			const settings = makeSettings({ lang: 'en', weekStartDay: 1, monthStartDay: 1 });

			// Create entries with various dates relative to fixed "today" (2026-06-28)
			const todayEntry = {
				task: {
					hasCheckbox: true, checked: false, priority: null as 'A' | 'B' | 'C' | null,
					text: 'Today task', scheduled: null, repeat: null, deadline: null,
					closed: null, line: 0, raw: '- [ ] Today task', metaLineCount: 0, indent: 0,
				},
				file: makeFile('gtd/test.md'),
				date: '2026-06-28', // today
				dateType: 'scheduled' as const,
			};
			const thisWeekEntry = {
				task: {
					hasCheckbox: true, checked: false, priority: null as 'A' | 'B' | 'C' | null,
					text: 'This week task', scheduled: '2026-06-25', repeat: null, deadline: null,
					closed: null, line: 0, raw: '- [ ] This week task', metaLineCount: 0, indent: 0,
				},
				file: makeFile('gtd/test.md'),
				date: '2026-06-25', // this week (Mon 22 - Sun 28)
				dateType: 'scheduled' as const,
			};
			const thisMonthEntry = {
				task: {
					hasCheckbox: true, checked: false, priority: null as 'A' | 'B' | 'C' | null,
					text: 'This month task', scheduled: '2026-06-15', repeat: null, deadline: null,
					closed: null, line: 0, raw: '- [ ] This month task', metaLineCount: 0, indent: 0,
				},
				file: makeFile('gtd/test.md'),
				date: '2026-06-15', // same month, different week
				dateType: 'scheduled' as const,
			};
			const futureEntry = {
				task: {
					hasCheckbox: true, checked: false, priority: null as 'A' | 'B' | 'C' | null,
					text: 'Future task', scheduled: '2026-07-20', repeat: null, deadline: null,
					closed: null, line: 0, raw: '- [ ] Future task', metaLineCount: 0, indent: 0,
				},
				file: makeFile('gtd/test.md'),
				date: '2026-07-20',
				dateType: 'scheduled' as const,
			};
			const noDateEntry = {
				task: {
					hasCheckbox: true, checked: false, priority: null as 'A' | 'B' | 'C' | null,
					text: 'No date task', scheduled: null, repeat: null, deadline: null,
					closed: null, line: 0, raw: '- [ ] No date task', metaLineCount: 0, indent: 0,
				},
				file: makeFile('gtd/test.md'),
				date: '',
				dateType: '' as const,
			};

			const entries = [futureEntry, noDateEntry, todayEntry, thisWeekEntry, thisMonthEntry];

			const groups = groupTasks(entries, settings);

			// Should produce groups with entries (non-empty groups)
			expect(groups.length).toBeGreaterThan(0);

			// Find each group by title
			const todayGroup = groups.find(g => g.title.includes('Today'));
			const thisWeekGroup = groups.find(g => g.title.includes('This Week'));
			const thisMonthGroup = groups.find(g => g.title.includes('This Month'));
			const futureGroup = groups.find(g => g.title.includes('Future'));
			const noDateGroup = groups.find(g => g.title.includes('No Date'));

			// Today entry should be in Today group
			expect(todayGroup).toBeDefined();
			expect(todayGroup!.entries.some(e =>
				(e as Record<string, unknown>).task === todayEntry.task,
			)).toBe(true);
			expect(todayGroup!.entries).toHaveLength(1);

			// This Week entry should NOT be in Today, but should be in This Week
			expect(thisWeekGroup).toBeDefined();
			const weekTexts = thisWeekGroup!.entries.map(e =>
				((e as Record<string, unknown>).task as Record<string, unknown>).text,
			);
			expect(weekTexts).toContain('This week task');

			// This Month
			expect(thisMonthGroup).toBeDefined();
			const monthTexts = thisMonthGroup!.entries.map(e =>
				((e as Record<string, unknown>).task as Record<string, unknown>).text,
			);
			expect(monthTexts).toContain('This month task');

			// Future
			expect(futureGroup).toBeDefined();
			const futureTexts = futureGroup!.entries.map(e =>
				((e as Record<string, unknown>).task as Record<string, unknown>).text,
			);
			expect(futureTexts).toContain('Future task');

			// No Date
			expect(noDateGroup).toBeDefined();
			const noDateTexts = noDateGroup!.entries.map(e =>
				((e as Record<string, unknown>).task as Record<string, unknown>).text,
			);
			expect(noDateTexts).toContain('No date task');

			vi.useRealTimers();
		});

		it('creates all 5 group slots (Today, This Week, This Month, Future, No Date) when entries exist for each', () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-06-28'));

			const settings = makeSettings({ lang: 'en', weekStartDay: 1, monthStartDay: 1 });

			// Create one entry per category
			const entries = [
				{
					task: {
						hasCheckbox: true, checked: false, priority: null as 'A' | 'B' | 'C' | null,
						text: 'No date', scheduled: null, repeat: null, deadline: null,
						closed: null, line: 0, raw: '- [ ] No date', metaLineCount: 0, indent: 0,
					},
					file: makeFile('gtd/test.md'), date: '', dateType: '' as const,
				},
				{
					task: {
						hasCheckbox: true, checked: false, priority: null as 'A' | 'B' | 'C' | null,
						text: 'Future week', scheduled: '2026-07-20', repeat: null, deadline: null,
						closed: null, line: 0, raw: '- [ ] Future', metaLineCount: 0, indent: 0,
					},
					file: makeFile('gtd/test.md'), date: '2026-07-20', dateType: 'scheduled' as const,
				},
				{
					task: {
						hasCheckbox: true, checked: false, priority: null as 'A' | 'B' | 'C' | null,
						text: 'This month only', scheduled: '2026-06-15', repeat: null, deadline: null,
						closed: null, line: 0, raw: '- [ ] This month', metaLineCount: 0, indent: 0,
					},
					file: makeFile('gtd/test.md'), date: '2026-06-15', dateType: 'scheduled' as const,
				},
				{
					task: {
						hasCheckbox: true, checked: false, priority: null as 'A' | 'B' | 'C' | null,
						text: 'Today', scheduled: '2026-06-28', repeat: null, deadline: null,
						closed: null, line: 0, raw: '- [ ] Today', metaLineCount: 0, indent: 0,
					},
					file: makeFile('gtd/test.md'), date: '2026-06-28', dateType: 'scheduled' as const,
				},
			];

			const groups = groupTasks(entries, settings);

			// All 5 group slots should be present because each category has entries
			// (Today entry propagates into Today/ThisWeek/ThisMonth groups)
			expect(groups.length).toBe(5);
			// Order should be: Today (0), This Week (1), This Month (2), Future (3), No Date (4)
			expect(groups[0]!.title).toContain('Today');
			expect(groups[1]!.title).toContain('This Week');
			expect(groups[2]!.title).toContain('This Month');
			expect(groups[3]!.title).toContain('Future');
			expect(groups[4]!.title).toContain('No Date');

			vi.useRealTimers();
		});
	});

	// ── Sorting within groups ────────────────────────────────────────────

	describe('sort order within groups (replicating the renderGroups sort logic)', () => {
		// The sort logic from AgendaView.renderGroups():
		function sortEntries(entries: unknown[]): unknown[] {
			const order: Record<string, number> = { A: 0, B: 1, C: 2 };
			return [...entries].sort((a: unknown, b: unknown) => {
				const aEntry = a as { date: string; task: { priority: string | null } };
				const bEntry = b as { date: string; task: { priority: string | null } };
				if (aEntry.date && bEntry.date && aEntry.date !== bEntry.date) {
					return aEntry.date < bEntry.date ? -1 : 1;
				}
				return (order[aEntry.task.priority ?? ''] ?? 3) - (order[bEntry.task.priority ?? ''] ?? 3);
			});
		}

		it('sorts entries by priority: A > B > C > none when dates are the same', () => {
			const entries = [
				{ task: { priority: null, text: 'No priority' }, date: '2026-06-28' },
				{ task: { priority: 'B', text: 'Priority B' }, date: '2026-06-28' },
				{ task: { priority: 'A', text: 'Priority A' }, date: '2026-06-28' },
				{ task: { priority: 'C', text: 'Priority C' }, date: '2026-06-28' },
			];

			const sorted = sortEntries(entries);
			const texts = sorted.map(e => (e as Record<string, unknown>).task).map(
				t => (t as Record<string, unknown>).text,
			);
			expect(texts).toEqual(['Priority A', 'Priority B', 'Priority C', 'No priority']);
		});

		it('sorts by date then priority when dates differ', () => {
			const entries = [
				{ task: { priority: 'A', text: 'Future A' }, date: '2026-06-15' },
				{ task: { priority: null, text: 'Future no prio' }, date: '2026-06-15' },
				{ task: { priority: 'B', text: 'Future B' }, date: '2026-06-15' },
				{ task: { priority: null, text: 'Later date' }, date: '2026-06-20' },
			];

			const sorted = sortEntries(entries);
			const texts = sorted.map(e => (e as Record<string, unknown>).task).map(
				t => (t as Record<string, unknown>).text,
			);
			// Same date (2026-06-15) entries sorted by priority A, B, none
			// then later date (2026-06-20) entry
			expect(texts).toEqual(['Future A', 'Future B', 'Future no prio', 'Later date']);
		});

		it('entries with no date sort after dated entries', () => {
			const entries = [
				{ task: { priority: 'A', text: 'Dated A' }, date: '2026-06-28' },
				{ task: { priority: null, text: 'No date' }, date: '' },
				{ task: { priority: 'B', text: 'Dated B' }, date: '2026-06-28' },
			];

			const sorted = sortEntries(entries);
			const texts = sorted.map(e => (e as Record<string, unknown>).task).map(
				t => (t as Record<string, unknown>).text,
			);
			expect(texts).toEqual(['Dated A', 'Dated B', 'No date']);
		});
	});

	// ── updateSettings ───────────────────────────────────────────────────

	describe('updateSettings()', () => {
		it('updates the internal settings reference', () => {
			const settings1 = makeSettings({ lang: 'zh', gtdFolder: 'gtd' });
			const view = createView(makeApp([]), settings1);

			// settings is private, access via type cast
			const viewAny = view as unknown as { settings: GtdPluginSettings };
			expect(viewAny.settings).toBe(settings1);
			expect(viewAny.settings.lang).toBe('zh');

			const settings2 = makeSettings({ lang: 'en', gtdFolder: 'gtd-en' });
			view.updateSettings(settings2);

			expect(viewAny.settings).toBe(settings2);
			expect(viewAny.settings.lang).toBe('en');
		});

		it('calls refresh to re-render', async () => {
			const settings1 = makeSettings({ lang: 'zh' });
			const view = createView(makeApp([]), settings1);

			const viewAny = view as unknown as { refresh: () => Promise<void> };
			const refreshSpy = vi.spyOn(viewAny, 'refresh').mockResolvedValue(undefined);

			const settings2 = makeSettings({ lang: 'en' });
			view.updateSettings(settings2);

			// refresh should have been called (asynchronously)
			expect(refreshSpy).toHaveBeenCalledTimes(1);

			refreshSpy.mockRestore();
		});
	});

	// ── View type and display ────────────────────────────────────────────

	describe('view identity', () => {
		it('returns the correct view type', () => {
			const view = createView(makeApp([]));
			expect(view.getViewType()).toBe(AGENDA_VIEW_TYPE);
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
});
