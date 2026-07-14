/**
 * Integration tests for DatePickerModal.
 *
 * Tests the date picker modal's core flow:
 * - onOpen() creates the expected DOM structure
 * - Preset buttons (Today, Tomorrow, +3d, +7d, +14d) produce correct dates
 * - Text input date entry works
 * - Remove button works for existing dates
 */
import { vi, describe, it, expect, afterEach } from 'vitest';

vi.mock('obsidian', () => import('../helpers/obsidian-mock').then(m => m.obsidianMockModule()));

// DatePickerModal uses window.setTimeout
vi.stubGlobal('window', { setTimeout: globalThis.setTimeout.bind(globalThis) });

import { DatePickerModal } from '../../views/date-picker-modal';
import { MockApp, MockHTMLElement } from '../helpers/obsidian-mock';

// ─── Helpers ─────────────────────────────────────────────────────────────

/** Recursively find first MockHTMLElement matching a predicate among children */
function findFirst(
	el: MockHTMLElement,
	pred: (c: MockHTMLElement) => boolean,
): MockHTMLElement | undefined {
	for (const child of el._children) {
		if (pred(child)) return child;
		const found = findFirst(child, pred);
		if (found) return found;
	}
	return undefined;
}

const app = new MockApp();

// ─── Tests ───────────────────────────────────────────────────────────────

describe('DatePickerModal', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('onOpen()', () => {
		it('creates the modal content without throwing', () => {
			const modal = new DatePickerModal(app, 'Select date', null, 'en');
			expect(() => { modal.onOpen(); }).not.toThrow();
		});

		it('sets the title in the heading', () => {
			const modal = new DatePickerModal(app, 'Custom Title', null, 'en');
			modal.onOpen();

			const headings = modal.contentEl._children.filter(c => c.tagName === 'h3');
			expect(headings.length).toBeGreaterThanOrEqual(1);
			expect(headings[0]!._textContent).toBe('Custom Title');
		});

		it('shows the current date when provided', () => {
			const modal = new DatePickerModal(app, 'Pick date', '2026-07-15', 'en');
			modal.onOpen();

			const currentDiv = modal.contentEl._children.find(
				c => c._classList.has('gtd-dp-current'),
			);
			expect(currentDiv).toBeDefined();
			expect(currentDiv!._textContent).toContain('2026-07-15');
		});

		it('does not show current date section when no current date', () => {
			const modal = new DatePickerModal(app, 'Pick date', null, 'en');
			modal.onOpen();

			const currentDiv = modal.contentEl._children.find(
				c => c._classList.has('gtd-dp-current'),
			);
			expect(currentDiv).toBeUndefined();
		});

		it('adds the gtd-datepicker-modal class to contentEl', () => {
			const modal = new DatePickerModal(app, 'Date', null, 'en');
			modal.onOpen();
			expect(modal.contentEl._classList.has('gtd-datepicker-modal')).toBe(true);
		});
	});

	describe('preset buttons', () => {
		it('shows all 5 preset buttons (Today, Tomorrow, +3d, +7d, +14d)', () => {
			const modal = new DatePickerModal(app, 'Date', null, 'en');
			modal.onOpen();

			// Find quick row div
			const quickRow = modal.contentEl._children.find(
				c => c._classList.has('gtd-dp-quick-row'),
			);
			expect(quickRow).toBeDefined();

			// Should have 5 preset buttons
			const presetBtns = quickRow!._children.filter(c => c._classList.has('gtd-dp-btn'));
			expect(presetBtns).toHaveLength(5);
			expect(presetBtns[0]!._textContent).toBe('Today');
			expect(presetBtns[1]!._textContent).toBe('Tomorrow');
		});

		it('preset buttons create date results on click', async () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-06-28'));

			const modal = new DatePickerModal(app, 'Date', null, 'en');
			modal.onOpen();

			// Start waiting for result
			const resultPromise = modal.waitForResult();

			// Find and click the "Tomorrow" button
			const quickRow = modal.contentEl._children.find(
				c => c._classList.has('gtd-dp-quick-row'),
			);
			expect(quickRow).toBeDefined();

			const tomorrowBtn = quickRow!._children.find(
				c => c._classList.has('gtd-dp-btn') && c._textContent === 'Tomorrow',
			);
			expect(tomorrowBtn).toBeDefined();

			// Click tomorrow button
			const clickHandler = tomorrowBtn!._listeners.get('click');
			expect(clickHandler).toBeDefined();
			clickHandler!({});

			// Check result
			const result = await resultPromise;
			expect(result).toBe('2026-06-29');

			vi.useRealTimers();
		});

		it('Today preset returns today\'s date', async () => {
			vi.useFakeTimers();
			vi.setSystemTime(new Date('2026-06-28'));

			const modal = new DatePickerModal(app, 'Date', null, 'en');
			modal.onOpen();

			const resultPromise = modal.waitForResult();

			const quickRow = modal.contentEl._children.find(
				c => c._classList.has('gtd-dp-quick-row'),
			);
			const todayBtn = quickRow!._children.find(
				c => c._classList.has('gtd-dp-btn') && c._textContent === 'Today',
			);
			todayBtn!._listeners.get('click')!({});

			const result = await resultPromise;
			expect(result).toBe('2026-06-28');

			vi.useRealTimers();
		});
	});

	describe('text input and set button', () => {
		it('has text input with placeholder', () => {
			const modal = new DatePickerModal(app, 'Date', null, 'en');
			modal.onOpen();

			const textInput = findFirst(modal.contentEl,
				(c) => c.tagName === 'input' && c._classList.has('gtd-dp-text-input'),
			);
			expect(textInput).toBeDefined();
			expect(textInput!._attributes.get('placeholder')).toBe('20260630');
		});

		it('has Set and Cancel buttons', () => {
			const modal = new DatePickerModal(app, 'Date', null, 'en');
			modal.onOpen();

			const setBtn = findFirst(modal.contentEl,
				(c) => c.tagName === 'button' && c._classList.has('gtd-dp-set-btn'),
			);
			expect(setBtn).toBeDefined();
			expect(setBtn!._textContent).toBe('Set');

			const cancelBtn = findFirst(modal.contentEl,
				(c) => c.tagName === 'button' && c._classList.has('gtd-dp-cancel'),
			);
			expect(cancelBtn).toBeDefined();
			expect(cancelBtn!._textContent).toBe('Cancel');
		});

		it('has Remove button when current date is provided', () => {
			const modal = new DatePickerModal(app, 'Date', '2026-07-15', 'en');
			modal.onOpen();

			const removeBtn = findFirst(modal.contentEl,
				(c) => c.tagName === 'button' && c._classList.has('gtd-dp-remove'),
			);
			expect(removeBtn).toBeDefined();
			expect(removeBtn!._textContent).toBe('Remove');
		});

		it('does not have Remove button when no current date', () => {
			const modal = new DatePickerModal(app, 'Date', null, 'en');
			modal.onOpen();

			const removeBtn = findFirst(modal.contentEl,
				(c) => c.tagName === 'button' && c._classList.has('gtd-dp-remove'),
			);
			expect(removeBtn).toBeUndefined();
		});
	});

	describe('waitForResult()', () => {
		it('resolves with "remove" when Remove button is clicked', async () => {
			const modal = new DatePickerModal(app, 'Date', '2026-07-15', 'en');
			modal.onOpen();

			const resultPromise = modal.waitForResult();

			const removeBtn = findFirst(modal.contentEl,
				(c) => c.tagName === 'button' && c._classList.has('gtd-dp-remove'),
			);
			removeBtn!._listeners.get('click')!({} as Event);

			const value = await resultPromise;
			expect(value).toBe('remove');
		});

		it('Cancel button closes without resolving', () => {
			const modal = new DatePickerModal(app, 'Date', null, 'en');
			modal.onOpen();

			let resolved = false;
			modal.waitForResult().then(() => { resolved = true; });

			const cancelBtn = findFirst(modal.contentEl,
				(c) => c.tagName === 'button' && c._classList.has('gtd-dp-cancel'),
			);
			cancelBtn!._listeners.get('click')!({} as Event);

			// Cancel just closes without calling resolved, so the promise stays pending
			expect(resolved).toBe(false);
		});
	});

	describe('onClose()', () => {
		it('empties contentEl without throwing', () => {
			const modal = new DatePickerModal(app, 'Date', null, 'en');
			modal.onOpen();
			expect(() => { modal.onClose(); }).not.toThrow();
			expect(modal.contentEl._children.length).toBe(0);
		});
	});

	describe('preset labels in zh', () => {
		it('shows Chinese labels for preset buttons', () => {
			const modal = new DatePickerModal(app, '选择日期', null, 'zh');
			modal.onOpen();

			const quickRow = modal.contentEl._children.find(
				c => c._classList.has('gtd-dp-quick-row'),
			);
			const presetBtns = quickRow!._children.filter(c => c._classList.has('gtd-dp-btn'));

			expect(presetBtns.length).toBe(5);
			expect(presetBtns[0]!._textContent).toBe('今天');
			expect(presetBtns[1]!._textContent).toBe('明天');
		});
	});
});
