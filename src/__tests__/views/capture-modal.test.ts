/**
 * Integration tests for CaptureModal.
 *
 * Tests the capture modal's core flow:
 * - onOpen() creates the expected DOM structure
 * - Capture flow appends tasks to the inbox file
 * - Keyboard shortcuts are registered
 * - Vault is used correctly for existing and new files
 */
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

vi.mock('obsidian', () => import('../helpers/obsidian-mock').then(m => m.obsidianMockModule()));

// The capture modal uses window.setTimeout which is not available in Node.
vi.stubGlobal('window', { setTimeout: globalThis.setTimeout.bind(globalThis) });

import { CaptureModal } from '../../views/capture-modal';
import { MockApp, MockTFile, MockHTMLElement } from '../helpers/obsidian-mock';

// ─── Helpers ─────────────────────────────────────────────────────────────

/** Recursively find MockHTMLElements matching a predicate among children */
function findIn(el: MockHTMLElement, pred: (c: MockHTMLElement) => boolean): MockHTMLElement[] {
	const results: MockHTMLElement[] = [];
	for (const child of el._children) {
		if (pred(child)) results.push(child);
		results.push(...findIn(child, pred));
	}
	return results;
}

/** Recursively find first MockHTMLElement matching a predicate among children */
function findFirst(el: MockHTMLElement, pred: (c: MockHTMLElement) => boolean): MockHTMLElement | undefined {
	for (const child of el._children) {
		if (pred(child)) return child;
		const found = findFirst(child, pred);
		if (found) return found;
	}
	return undefined;
}

const mouseEvent = { type: 'click' } as unknown as Event;

// ─── Test factory ────────────────────────────────────────────────────────

function makeApp(files: { path: string; content: string }[]): MockApp & {
	vault: MockApp['vault'] & { append: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
} {
	const vaultFiles = files.map(f => new MockTFile(f.path));
	const readMap = new Map<string, string>();
	for (const f of files) {
		readMap.set(f.path, f.content);
	}
	const app = new MockApp({ vaultFiles, vaultReadMap: readMap }) as MockApp & {
		vault: MockApp['vault'] & { append: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
	};
	vi.spyOn(app.vault, 'append');
	vi.spyOn(app.vault, 'create');
	return app;
}

// ─── Tests ───────────────────────────────────────────────────────────────

describe('CaptureModal', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('onOpen()', () => {
		it('creates the modal content without throwing', () => {
			const app = makeApp([]);
			const modal = new CaptureModal(app, 'gtd/inbox-收集箱.md', 'zh');

			expect(() => { modal.onOpen(); }).not.toThrow();
		});

		it('sets the correct heading text for zh', () => {
			const app = makeApp([]);
			const modal = new CaptureModal(app, 'gtd/inbox-收集箱.md', 'zh');
			modal.onOpen();

			const headings = findIn(modal.contentEl, (c) => c.tagName === 'h3');
			expect(headings.length).toBeGreaterThanOrEqual(1);
			expect(headings[0]!._textContent).toContain('快速捕获');
		});

		it('sets the correct heading text for en', () => {
			const app = makeApp([]);
			const modal = new CaptureModal(app, 'gtd/inbox-收集箱.md', 'en');
			modal.onOpen();

			const headings = findIn(modal.contentEl, (c) => c.tagName === 'h3');
			expect(headings.length).toBeGreaterThanOrEqual(1);
			expect(headings[0]!._textContent).toContain('Quick Capture');
		});

		it('adds the gtd-capture-modal class to contentEl', () => {
			const app = makeApp([]);
			const modal = new CaptureModal(app, 'gtd/inbox-收集箱.md', 'zh');
			modal.onOpen();

			expect(modal.contentEl._classList.has('gtd-capture-modal')).toBe(true);
		});
	});

	describe('capture flow with existing inbox file', () => {
		it('appends task to an existing inbox file using zh keywords', async () => {
			const app = makeApp([
				{ path: 'gtd/inbox-收集箱.md', content: '- [ ] Existing task\n' },
			]);
			const modal = new CaptureModal(app, 'gtd/inbox-收集箱.md', 'zh');
			modal.onOpen();

			// Find input and submit button
			const input = findFirst(modal.contentEl,
				(c) => c.tagName === 'input' && c._attributes.get('type') === 'text');
			expect(input).toBeDefined();

			const submitBtn = findFirst(modal.contentEl,
				(c) => c.tagName === 'button' && c._classList.has('gtd-capture-submit'));
			expect(submitBtn).toBeDefined();

			// Set input value
			if (input) input.value = 'New task via capture';
			// Click submit button
			if (submitBtn) {
				await submitBtn._listeners.get('click')!(mouseEvent);
			}

			// Verify append was called
			expect(app.vault.append).toHaveBeenCalledTimes(1);
			const appendCall = (app.vault.append as ReturnType<typeof vi.fn>).mock.calls[0];
			expect(appendCall[0].path).toBe('gtd/inbox-收集箱.md');
			expect(appendCall[1]).toMatch(/^- \[ \] New task via capture/);
		});

		it('includes priority when selected', async () => {
			const app = makeApp([
				{ path: 'gtd/inbox-收集箱.md', content: '' },
			]);
			const modal = new CaptureModal(app, 'gtd/inbox-收集箱.md', 'zh');
			modal.onOpen();

			// Find priority button A (nested inside btn groups)
			const prioBtnA = findFirst(modal.contentEl,
				(c) => c.tagName === 'button' && c._classList.has('gtd-prio-btn')
					&& c._attributes.get('data-value') === 'A');
			expect(prioBtnA).toBeDefined();

			if (prioBtnA) {
				const clickHandler = prioBtnA._listeners.get('click');
				expect(clickHandler).toBeDefined();
				clickHandler!(mouseEvent);
			}

			// Set task text and submit
			const input = findFirst(modal.contentEl,
				(c) => c.tagName === 'input' && c._attributes.get('type') === 'text');
			if (input) input.value = 'High priority task';

			const submitBtn = findFirst(modal.contentEl,
				(c) => c.tagName === 'button' && c._classList.has('gtd-capture-submit'));
			if (submitBtn) {
				await submitBtn._listeners.get('click')!(mouseEvent);
			}

			expect(app.vault.append).toHaveBeenCalledTimes(1);
			const content = (app.vault.append as ReturnType<typeof vi.fn>).mock.calls[0][1];
			expect(content).toMatch(/- \[ \] High priority task.*\[#A\]/);
		});
	});

	describe('capture flow with non-existing inbox file', () => {
		it('creates a new inbox file when it does not exist', async () => {
			const app = makeApp([]);
			const modal = new CaptureModal(app, 'gtd/inbox-收集箱.md', 'zh');
			modal.onOpen();

			const input = findFirst(modal.contentEl,
				(c) => c.tagName === 'input' && c._attributes.get('type') === 'text');
			if (input) input.value = 'Brand new inbox task';

			const submitBtn = findFirst(modal.contentEl,
				(c) => c.tagName === 'button' && c._classList.has('gtd-capture-submit'));
			if (submitBtn) {
				await submitBtn._listeners.get('click')!(mouseEvent);
			}

			expect(app.vault.create).toHaveBeenCalledTimes(1);
			expect(app.vault.create).toHaveBeenCalledWith(
				'gtd/inbox-收集箱.md',
				expect.stringContaining('Brand new inbox task'),
			);
		});
	});

	describe('capture flow with dates', () => {
		it('includes SCHEDULED and DEADLINE dates when set', async () => {
			const app = makeApp([
				{ path: 'gtd/inbox.md', content: '' },
			]);
			const modal = new CaptureModal(app, 'gtd/inbox.md', 'en');
			modal.onOpen();

			// Set task text
			const input = findFirst(modal.contentEl,
				(c) => c.tagName === 'input' && c._attributes.get('type') === 'text');
			if (input) input.value = 'Task with dates';

			// Find date inputs (type=date)
			const dateInputs = findIn(modal.contentEl,
				(c) => c.tagName === 'input' && c._attributes.get('type') === 'date');
			expect(dateInputs.length).toBeGreaterThanOrEqual(2);

			// Set SCHEDULED date (set value before triggering change)
			dateInputs[0]!.value = '2026-07-01';
			const schedChangeHandler = dateInputs[0]!._listeners.get('change');
			if (schedChangeHandler) {
				schedChangeHandler({ target: { value: '2026-07-01' } } as unknown as Event);
			}

			// Set DEADLINE date
			dateInputs[1]!.value = '2026-07-15';
			const deadChangeHandler = dateInputs[1]!._listeners.get('change');
			if (deadChangeHandler) {
				deadChangeHandler({ target: { value: '2026-07-15' } } as unknown as Event);
			}

			const submitBtn = findFirst(modal.contentEl,
				(c) => c.tagName === 'button' && c._classList.has('gtd-capture-submit'));
			if (submitBtn) {
				await submitBtn._listeners.get('click')!(mouseEvent);
			}

			expect(app.vault.append).toHaveBeenCalledTimes(1);
			const content = (app.vault.append as ReturnType<typeof vi.fn>).mock.calls[0][1];
			expect(content).toContain('SCHEDULED: <2026-07-01>');
			expect(content).toContain('DEADLINE: <2026-07-15>');
		});
	});

	describe('edge cases', () => {
		it('does not append or create when task text is empty', async () => {
			const app = makeApp([]);
			const modal = new CaptureModal(app, 'gtd/inbox.md', 'en');
			modal.onOpen();

			const input = findFirst(modal.contentEl,
				(c) => c.tagName === 'input' && c._attributes.get('type') === 'text');
			if (input) input.value = '';

			const submitBtn = findFirst(modal.contentEl,
				(c) => c.tagName === 'button' && c._classList.has('gtd-capture-submit'));
			if (submitBtn) {
				await submitBtn._listeners.get('click')!(mouseEvent);
			}

			expect(app.vault.append).not.toHaveBeenCalled();
			expect(app.vault.create).not.toHaveBeenCalled();
		});
	});

	describe('keyboard shortcuts', () => {
		it('registers Enter and Escape keyboard handlers', () => {
			const app = makeApp([]);
			const modal = new CaptureModal(app, 'gtd/inbox.md', 'en');

			const registerSpy = vi.spyOn(modal.scope, 'register');
			modal.onOpen();

			expect(registerSpy).toHaveBeenCalledWith([], 'Enter', expect.any(Function));
			expect(registerSpy).toHaveBeenCalledWith([], 'Escape', expect.any(Function));
		});
	});

	describe('onClose()', () => {
		it('empties contentEl without throwing', () => {
			const app = makeApp([]);
			const modal = new CaptureModal(app, 'gtd/inbox.md', 'zh');
			modal.onOpen();
			expect(() => { modal.onClose(); }).not.toThrow();
			expect(modal.contentEl._children.length).toBe(0);
		});
	});
});
