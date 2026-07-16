/**
 * Unit tests for src/utils/parser-cache.ts
 *
 * Tests the LRU cache behavior:
 * - Basic get/set/has
 * - LRU eviction when max size is exceeded
 * - Entry reordering on access (most recently used)
 * - invalidation (single and all)
 * - size tracking
 * - Edge cases: empty paths, zero max size
 *
 * Also tests the integration with parser.ts's parseFileTasks():
 * - Cache hit returns previously cached results
 * - Cache miss parses and caches
 * - Cache invalidation forces re-parse
 */
import { describe, it, expect } from 'vitest';
import { ParserCache } from '../../utils/parser-cache';
import { parseFileTasks } from '../../utils/parser';

// ==========================================================================
// ParserCache
// ==========================================================================

describe('ParserCache', () => {
	describe('get / set / has', () => {
		it('returns undefined for uncached path', () => {
			const cache = new ParserCache();
			expect(cache.get('gtd/inbox.md')).toBeUndefined();
		});

		it('stores and retrieves parsed tasks', () => {
			const cache = new ParserCache();
			const tasks = [
				{
					hasCheckbox: true, checked: false, priority: null as const,
					text: 'Test task', scheduled: null, repeat: null,
					deadline: null, closed: null, line: 0, raw: '- [ ] Test task',
					metaLineCount: 0, indent: 0,
				},
			];

			cache.set('gtd/inbox.md', tasks);
			expect(cache.has('gtd/inbox.md')).toBe(true);
			expect(cache.get('gtd/inbox.md')).toBe(tasks);
		});

		it('returns the same array reference on get after set', () => {
			const cache = new ParserCache();
			const tasks: import('../../models/task').ParsedTask[] = [];

			cache.set('path.md', tasks);
			const retrieved = cache.get('path.md');
			expect(retrieved).toBe(tasks);
		});

		it('returns undefined after invalidation', () => {
			const cache = new ParserCache();
			cache.set('gtd/tasks.md', []);
			cache.invalidate('gtd/tasks.md');
			expect(cache.get('gtd/tasks.md')).toBeUndefined();
		});
	});

	describe('LRU eviction', () => {
		it('evicts oldest entry when max size is exceeded', () => {
			const cache = new ParserCache(2); // max 2 entries

			cache.set('file1.md', []);
			cache.set('file2.md', []);
			expect(cache.has('file1.md')).toBe(true);
			expect(cache.has('file2.md')).toBe(true);

			// Add third entry → should evict file1 (oldest)
			cache.set('file3.md', []);
			expect(cache.has('file1.md')).toBe(false); // evicted
			expect(cache.has('file2.md')).toBe(true);
			expect(cache.has('file3.md')).toBe(true);
		});

		it('reorders entry on access, preventing eviction', () => {
			const cache = new ParserCache(2);

			cache.set('file1.md', []);
			cache.set('file2.md', []);

			// Access file1 → it becomes most recently used
			cache.get('file1.md');

			// Add third entry → should evict file2 (now oldest)
			cache.set('file3.md', []);
			expect(cache.has('file2.md')).toBe(false); // evicted
			expect(cache.has('file1.md')).toBe(true); // still there
			expect(cache.has('file3.md')).toBe(true);
		});

		it('reorders entry on set (updating existing), preventing eviction', () => {
			const cache = new ParserCache(2);

			cache.set('file1.md', []);
			cache.set('file2.md', []);

			// Re-set file1 → it becomes most recently used
			cache.set('file1.md', []);

			// Add third entry → should evict file2 (now oldest)
			cache.set('file3.md', []);
			expect(cache.has('file2.md')).toBe(false); // evicted
			expect(cache.has('file1.md')).toBe(true);
			expect(cache.has('file3.md')).toBe(true);
		});

		it('does not evict when under max size', () => {
			const cache = new ParserCache(10);

			for (let i = 0; i < 10; i++) {
				cache.set(`file${i}.md`, []);
			}

			expect(cache.size).toBe(10);
			// All entries should still be present
			for (let i = 0; i < 10; i++) {
				expect(cache.has(`file${i}.md`)).toBe(true);
			}
		});

		it('handles max size of 1 correctly', () => {
			const cache = new ParserCache(1);

			cache.set('file1.md', []);
			expect(cache.has('file1.md')).toBe(true);

			cache.set('file2.md', []);
			expect(cache.has('file1.md')).toBe(false); // evicted
			expect(cache.has('file2.md')).toBe(true);
		});
	});

	describe('invalidateAll', () => {
		it('clears all entries', () => {
			const cache = new ParserCache();
			cache.set('file1.md', []);
			cache.set('file2.md', []);
			expect(cache.size).toBe(2);

			cache.invalidateAll();
			expect(cache.size).toBe(0);
			expect(cache.get('file1.md')).toBeUndefined();
			expect(cache.get('file2.md')).toBeUndefined();
		});
	});

	describe('size tracking', () => {
		it('starts empty', () => {
			const cache = new ParserCache();
			expect(cache.size).toBe(0);
		});

		it('increments on set', () => {
			const cache = new ParserCache();
			cache.set('a.md', []);
			expect(cache.size).toBe(1);
			cache.set('b.md', []);
			expect(cache.size).toBe(2);
		});

		it('decrements on invalidation', () => {
			const cache = new ParserCache();
			cache.set('a.md', []);
			cache.set('b.md', []);
			cache.invalidate('a.md');
			expect(cache.size).toBe(1);
			cache.invalidate('b.md');
			expect(cache.size).toBe(0);
		});

		it('does not increase when re-setting existing key', () => {
			const cache = new ParserCache();
			cache.set('file.md', []);
			cache.set('file.md', []);
			expect(cache.size).toBe(1);
		});
	});

	describe('edge cases', () => {
		it('handles empty string path', () => {
			const cache = new ParserCache();
			cache.set('', []);
			expect(cache.has('')).toBe(true);
			expect(cache.get('')).toEqual([]);
			cache.invalidate('');
			expect(cache.has('')).toBe(false);
		});

		it('handles undefined after get on empty cache', () => {
			const cache = new ParserCache();
			expect(cache.get('nonexistent.md')).toBeUndefined();
		});

		it('default max size is 50', () => {
			const cache = new ParserCache();
			// Fill with 50 entries
			for (let i = 0; i < 50; i++) {
				cache.set(`file${i}.md`, []);
			}
			expect(cache.size).toBe(50);
			// Adding one more should evict oldest
			cache.set('overflow.md', []);
			expect(cache.size).toBe(50);
		});
	});
});

// ==========================================================================
// Integration: parseFileTasks with ParserCache
// ==========================================================================

describe('parseFileTasks with ParserCache', () => {
	it('caches parsed tasks and returns cached result on second call', () => {
		const cache = new ParserCache();
		const lines = ['- [ ] Task 1', '- [ ] Task 2'];

		// First call: cache miss, parse and cache
		const result1 = parseFileTasks(lines, 'test.md', cache);
		expect(result1).toHaveLength(2);
		expect(result1[0]?.text).toBe('Task 1');
		expect(result1[1]?.text).toBe('Task 2');
		expect(cache.has('test.md')).toBe(true);

		// Second call: cache hit, should return same reference
		const result2 = parseFileTasks(lines, 'test.md', cache);
		expect(result2).toBe(result1); // same array reference
	});

	it('returns empty array for file with no tasks', () => {
		const cache = new ParserCache();
		const lines = ['# Heading', '', 'Some text.'];

		const result = parseFileTasks(lines, 'empty.md', cache);
		expect(result).toEqual([]);
		expect(cache.has('empty.md')).toBe(true);
	});

	it('does not cache when no filePath is provided', () => {
		const cache = new ParserCache();
		const lines = ['- [ ] Task 1'];

		parseFileTasks(lines, undefined, cache);
		expect(cache.size).toBe(0);
	});

	it('does not cache when no cache is provided', () => {
		const lines = ['- [ ] Task 1'];

		const result = parseFileTasks(lines, 'test.md');
		expect(result).toHaveLength(1);
		// No cache to check, just ensure it works
	});

	it('invalidates cache and re-parses on next call', () => {
		const cache = new ParserCache();
		const lines1 = ['- [ ] Original task'];

		const result1 = parseFileTasks(lines1, 'test.md', cache);
		expect(result1).toHaveLength(1);
		expect(result1[0]?.text).toBe('Original task');

		// Invalidate the cache entry
		cache.invalidate('test.md');

		// Parse different content
		const lines2 = ['- [ ] Updated task'];
		const result2 = parseFileTasks(lines2, 'test.md', cache);
		expect(result2).toHaveLength(1);
		expect(result2[0]?.text).toBe('Updated task');
		expect(result2).not.toBe(result1); // different array reference
	});

	it('invalidates all and re-parses', () => {
		const cache = new ParserCache();
		const lines = ['- [ ] Task'];

		const result1 = parseFileTasks(lines, 'a.md', cache);
		parseFileTasks(lines, 'b.md', cache);
		expect(cache.size).toBe(2);

		cache.invalidateAll();
		expect(cache.size).toBe(0);

		// Re-parse
		const result2 = parseFileTasks(lines, 'a.md', cache);
		expect(result2).toHaveLength(1);
		expect(result2).not.toBe(result1); // re-parsed
	});

	it('parses tasks with multi-line metadata and caches correctly', () => {
		const cache = new ParserCache();
		const lines = [
			'- [ ] Meeting',
			'  SCHEDULED: <2026-06-28>',
			'  PRIORITY: [#A]',
			'',
			'- [ ] Another task',
		];

		const result = parseFileTasks(lines, 'meta.md', cache);
		expect(result).toHaveLength(2);
		expect(result[0]?.text).toBe('Meeting');
		expect(result[0]?.scheduled).toBe('2026-06-28');
		expect(result[0]?.priority).toBe('A');
		expect(result[0]?.metaLineCount).toBe(2);
		expect(result[1]?.text).toBe('Another task');

		// Cached result should be identical
		const cached = cache.get('meta.md');
		expect(cached).toBe(result);
	});

	it('handles empty lines and non-task lines correctly', () => {
		const cache = new ParserCache();
		const lines = [
			'',
			'# Heading',
			'',
			'- [ ] Real task',
			'  SCHEDULED: <2026-06-28>',
			'',
			'- Bare list item (not a task)',
		];

		const result = parseFileTasks(lines, 'mixed.md', cache);
		expect(result).toHaveLength(1);
		expect(result[0]?.text).toBe('Real task');
	});
});
