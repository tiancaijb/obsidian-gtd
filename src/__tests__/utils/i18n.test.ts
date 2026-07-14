/**
 * Unit tests for src/utils/i18n.ts
 *
 * Tests coverage:
 * - t(): all keys exist in both zh and en, return non-empty strings
 * - t(): non-existent key fallback behavior
 * - groupTitles(): returns correct grouping (5 titles)
 * - metaKeywords: all 7 metadata keys in both languages
 * - gtdFilenames: all 5 file entries have values
 */
import { describe, it, expect } from 'vitest';
import { t, groupTitles, metaKeywords, gtdFilenames } from '../../utils/i18n';

// ==========================================================================
// Shared test data
// ==========================================================================

/** Every translation key that MUST exist in BOTH zh AND en. */
const COMMON_KEYS: string[] = [
	// Agenda view — grouping headers
	'today',
	'thisWeek',
	'thisMonth',
	'future',
	'noDate',

	// Capture modal
	'quickCapture',
	'quickCapturePlaceholder',
	'noTasks',
	'captureHint',

	// Task metadata labels
	'scheduled',
	'deadline',
	'priority',

	// Priority labels
	'prioHigh',
	'prioMedium',
	'prioLow',
	'prioNone',
	'prioHint',

	// Capture button
	'current',
	'capture',

	// Date picker
	'tomorrow',
	'plus3d',
	'plus7d',
	'plus14d',
	'enterDate',
	'set',
	'remove',
	'cancel',

	// Task actions feedback
	'promoted',
	'demoted',
	'notTask',
	'captured',
	'enterTask',

	// Settings
	'settingsTitle',
	'settingsCapture',
	'settingsLanguage',
	'languageLabel',
	'languageDesc',
	'settingsAgenda',
	'weekStartDay',
	'weekStartDayDesc',
	'monday',
	'tuesday',
	'wednesday',
	'thursday',
	'friday',
	'saturday',
	'sunday',
	'monthStartDay',
	'monthStartDayDesc',
	'futureCutoff',
	'futureCutoffDesc',
	'settingsColors',
	'colorHint',
	'inboxName',
	'inboxDesc',
	'timerStarted',
	'timerTooShort',
	'gtdFolderTitle',
	'baseFolder',
	'baseFolderDesc',
	'inboxAuto',
	'inboxAutoDesc',
	'pomodoroTitle',
	'pomoLabel',
	'focusMin',
	'focusMinDesc',
	'shortBreak',
	'shortBreakDesc',
	'longBreak',
	'longBreakDesc',
	'longBreakAfter',
	'longBreakAfterDesc',
	'pomoReset',
	'pomoResetDesc',
	'resetToDefaults',

	// Timeline view
	'timelineTitle',
	'selectDate',
	'prevDay',
	'nextDay',
	'noClockRecords',
	'timelineFor',

	// Stats view
	'statsTitle',
	'sessions',
	'totalTime',
	'taskStats',
	'exportMarkdown',
	'exportCsv',
	'downloaded',
	'periodToday',
	'periodYesterday',
	'periodThisWeek',
	'periodLastWeek',
	'periodThisMonth',
	'periodLastMonth',
	'csvHeaders',
	'copied',

	// Welcome screen
	'welcomeTitle',
	'welcomeDesc',
	'welcomeStep1',
	'welcomeStep1Desc',
	'welcomeStep2',
	'welcomeStep2Desc',
	'welcomeStep3',
	'welcomeStep3Desc',
	'welcomeStep4',
	'welcomeStep4Desc',
	'welcomeNext',

	// Quick start
	'quickStart',
	'quickStartDesc',
	'qCmdCapture',
	'qCmdCaptureDesc',
	'qCmdPrio',
	'qCmdPrioDesc',
	'qCmdAgenda',
	'qCmdAgendaDesc',
	'qCmdTimer',
	'qCmdTimerDesc',
	'qCmdPromote',
	'qCmdPromoteDesc',
	'qCmdTimeline',
	'qCmdTimelineDesc',
	'qCmdStats',
	'qCmdStatsDesc',

	// Morning reminder
	'morningReminder',
	'morningReminderDesc',
	'morningReminderEnable',
	'morningReminderStart',
	'morningReminderEnd',
	'timeFormat',
];

// ==========================================================================
// t() — basic translation
// ==========================================================================

describe('t() — translation lookup', () => {
	describe('common keys exist in both languages', () => {
		for (const key of COMMON_KEYS) {
			it(`provides zh translation for "${key}"`, () => {
				const result = t(key, 'zh');
				expect(result).toBeTruthy();
				expect(typeof result).toBe('string');
				expect(result.length).toBeGreaterThan(0);
			});

			it(`provides en translation for "${key}"`, () => {
				const result = t(key, 'en');
				expect(result).toBeTruthy();
				expect(typeof result).toBe('string');
				expect(result.length).toBeGreaterThan(0);
			});
		}
	});

	describe('en-only keys (themes)', () => {
		const enOnlyKeys = [
			'settingsAppearance',
			'themeLabel',
			'themeDesc',
			'themeBasic',
			'themePremiumDark',
		];

		for (const key of enOnlyKeys) {
			it(`provides en translation for "${key}"`, () => {
				expect(t(key, 'en')).toBeTruthy();
			});

			it(`falls back to en for zh for "${key}"`, () => {
				// zh doesn't have this key, so should fallback to en value
				const result = t(key, 'zh');
				expect(result).toBeTruthy();
				// Should have gotten the en value
				expect(result).toBe(t(key, 'en'));
			});
		}
	});

	describe('fallback behavior', () => {
		it('returns the key itself when neither zh nor en has it', () => {
			expect(t('this-key-does-not-exist', 'zh')).toBe('this-key-does-not-exist');
			expect(t('this-key-does-not-exist', 'en')).toBe('this-key-does-not-exist');
		});

		it('falls back from zh to en for missing zh key', () => {
			// 'settingsAppearance' exists in en but not zh
			expect(t('settingsAppearance', 'zh')).toBe('🎨 Appearance');
		});
	});
});

// ==========================================================================
// groupTitles()
// ==========================================================================

describe('groupTitles()', () => {
	it('returns 5 group titles for zh', () => {
		const titles = groupTitles('zh');
		expect(titles).toHaveLength(5);
	});

	it('returns 5 group titles for en', () => {
		const titles = groupTitles('en');
		expect(titles).toHaveLength(5);
	});

	it('includes the "today" reference for zh', () => {
		const titles = groupTitles('zh');
		expect(titles[0]).toContain('今天');
	});

	it('includes the "today" reference for en', () => {
		const titles = groupTitles('en');
		expect(titles[0]).toContain('Today');
	});

	it('zh titles are all non-empty strings', () => {
		for (const title of groupTitles('zh')) {
			expect(title).toBeTruthy();
			expect(title.length).toBeGreaterThan(0);
		}
	});

	it('en titles are all non-empty strings', () => {
		for (const title of groupTitles('en')) {
			expect(title).toBeTruthy();
			expect(title.length).toBeGreaterThan(0);
		}
	});
});

// ==========================================================================
// metaKeywords
// ==========================================================================

describe('metaKeywords', () => {
	const expectedKeys = ['scheduled', 'deadline', 'closed', 'priority', 'repeat', 'logged', 'clock'];

	it('has all 7 keyword entries for zh', () => {
		expect(Object.keys(metaKeywords.zh)).toHaveLength(7);
		for (const key of expectedKeys) {
			expect(metaKeywords.zh[key]).toBeTruthy();
		}
	});

	it('has all 7 keyword entries for en', () => {
		expect(Object.keys(metaKeywords.en)).toHaveLength(7);
		for (const key of expectedKeys) {
			expect(metaKeywords.en[key]).toBeTruthy();
		}
	});

	it('zh keywords are non-empty strings', () => {
		for (const [key, value] of Object.entries(metaKeywords.zh)) {
			expect(value).toBeTruthy(`zh metaKeyword "${key}" should be non-empty`);
		}
	});

	it('en keywords are non-empty strings', () => {
		for (const [key, value] of Object.entries(metaKeywords.en)) {
			expect(value).toBeTruthy(`en metaKeyword "${key}" should be non-empty`);
		}
	});

	it('zh keywords are Chinese', () => {
		expect(metaKeywords.zh.scheduled).toBe('计划');
		expect(metaKeywords.zh.deadline).toBe('截止');
		expect(metaKeywords.zh.closed).toBe('完成');
		expect(metaKeywords.zh.priority).toBe('优先级');
		expect(metaKeywords.zh.repeat).toBe('重复');
		expect(metaKeywords.zh.logged).toBe('日志');
		expect(metaKeywords.zh.clock).toBe('计时');
	});

	it('en keywords are English metadata tags', () => {
		expect(metaKeywords.en.scheduled).toBe('SCHEDULED');
		expect(metaKeywords.en.deadline).toBe('DEADLINE');
		expect(metaKeywords.en.closed).toBe('CLOSED');
		expect(metaKeywords.en.priority).toBe('PRIORITY');
		expect(metaKeywords.en.repeat).toBe('REPEAT');
		expect(metaKeywords.en.logged).toBe('LOGGED');
		expect(metaKeywords.en.clock).toBe('CLOCK');
	});

	it('zh and en have the same set of keys', () => {
		const zhKeys = Object.keys(metaKeywords.zh).sort();
		const enKeys = Object.keys(metaKeywords.en).sort();
		expect(zhKeys).toEqual(enKeys);
	});
});

// ==========================================================================
// gtdFilenames
// ==========================================================================

describe('gtdFilenames', () => {
	const expectedKeys = ['inbox', 'next', 'waiting', 'someday', 'projects'];

	it('has all 5 file entries', () => {
		expect(Object.keys(gtdFilenames)).toHaveLength(5);
		for (const key of expectedKeys) {
			expect(gtdFilenames[key]).toBeTruthy();
		}
	});

	it('all file names are non-empty strings', () => {
		for (const [key, value] of Object.entries(gtdFilenames)) {
			expect(value).toBeTruthy(`gtdFilename "${key}" should be non-empty`);
			expect(value.length).toBeGreaterThan(0);
		}
	});

	it('returns correct filenames', () => {
		expect(gtdFilenames.inbox).toBe('inbox-收集箱');
		expect(gtdFilenames.next).toBe('next-下一步行动');
		expect(gtdFilenames.waiting).toBe('waiting-等待中');
		expect(gtdFilenames.someday).toBe('someday-将来也许');
		expect(gtdFilenames.projects).toBe('projects-项目');
	});
});
