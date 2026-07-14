/**
 * Minimal setup verification test.
 * Confirms that vitest, TypeScript, and the mock infrastructure work.
 */
import { describe, it, expect, vi } from 'vitest';

// ─── Verify vitest itself works ───────────────────────────────────────────

describe('vitest setup', () => {
	it('runs a basic test', () => {
		expect(1 + 1).toBe(2);
	});

	it('supports async tests', async () => {
		const result = await Promise.resolve(42);
		expect(result).toBe(42);
	});

	it('supports vi.fn() mocks', () => {
		const fn = vi.fn((x: number) => x * 2);
		expect(fn(3)).toBe(6);
		expect(fn).toHaveBeenCalledWith(3);
	});
});

// ─── Verify Obsidian mock can be loaded ───────────────────────────────────

describe('obsidian mock module', () => {
	it('provides minimal class stubs', async () => {
		const obsidian = await import('./helpers/obsidian-mock');
		const module = obsidian.obsidianMockModule();

		expect(module.ItemView).toBeDefined();
		expect(module.WorkspaceLeaf).toBeDefined();
		expect(module.Notice).toBeDefined();
		expect(module.TFile).toBeDefined();
		expect(module.Vault).toBeDefined();
		expect(module.MarkdownView).toBeDefined();
		expect(module.Plugin).toBeDefined();
		expect(module.App).toBeDefined();
		expect(module.Editor).toBeDefined();
		expect(module.Setting).toBeDefined();
	});

	it('MockNotice stores its message', async () => {
		const { MockNotice } = await import('./helpers/obsidian-mock');
		const notice = new MockNotice('hello');
		expect(notice.message).toBe('hello');
	});

	it('MockTFile extracts basename', async () => {
		const { MockTFile } = await import('./helpers/obsidian-mock');
		const file = new MockTFile('gtd/inbox-收集箱.md');
		expect(file.path).toBe('gtd/inbox-收集箱.md');
		expect(file.basename).toBe('inbox-收集箱');
	});
});

// ─── Verify vi.mock('obsidian') works ─────────────────────────────────────

describe('vi.mock("obsidian") integration', () => {
	it('replaces obsidian imports with mocks', async () => {
		// This demonstrates the pattern — individual test files will call
		// vi.mock('obsidian', () => import('./helpers/obsidian-mock').then(m => m.obsidianMockModule()))
		// at the top of their module scope.
		const mockModule = (await import('./helpers/obsidian-mock')).obsidianMockModule();

		expect(mockModule.Notice).toBeDefined();
		expect(mockModule.ItemView).toBeDefined();
	});
});
