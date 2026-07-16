/**
 * LRU Cache for parsed task results.
 *
 * Caches ParsedTask[] per file path to avoid re-parsing unchanged files
 * during repeated view refreshes. The cache is invalidated via vault events
 * (modify, create, delete, rename) — managed by the plugin in main.ts.
 *
 * Uses a Map to maintain insertion order for LRU eviction.
 * The most recently accessed entries are moved to the end of the Map.
 * When the cache exceeds maxSize, the least recently used (first) entry is evicted.
 *
 * This class has no Obsidian dependencies — safe to import without mocking for unit tests.
 */

import { ParsedTask } from '../models/task';

const DEFAULT_MAX_SIZE = 50;

export class ParserCache {
	private cache = new Map<string, ParsedTask[]>();
	private readonly maxSize: number;

	constructor(maxSize: number = DEFAULT_MAX_SIZE) {
		this.maxSize = maxSize;
	}

	/**
	 * Get cached parsed tasks for a file path.
	 * Returns undefined if not cached.
	 * Marks the entry as most recently used (moves to end of Map).
	 */
	get(path: string): ParsedTask[] | undefined {
		const entry = this.cache.get(path);
		if (entry !== undefined) {
			// Move to end (most recently used position)
			this.cache.delete(path);
			this.cache.set(path, entry);
		}
		return entry;
	}

	/**
	 * Set cached parsed tasks for a file path.
	 * If the cache is full, evicts the least recently used entry (first in Map).
	 */
	set(path: string, tasks: ParsedTask[]): void {
		// If path already exists, delete first to update insertion order
		if (this.cache.has(path)) {
			this.cache.delete(path);
		} else if (this.cache.size >= this.maxSize) {
			// Evict least recently used (first entry in Map)
			const oldestKey = this.cache.keys().next().value;
			if (oldestKey !== undefined) {
				this.cache.delete(oldestKey);
			}
		}
		this.cache.set(path, tasks);
	}

	/** Check if a file path is in the cache */
	has(path: string): boolean {
		return this.cache.has(path);
	}

	/** Invalidate a specific file's cached parsed tasks */
	invalidate(path: string): void {
		this.cache.delete(path);
	}

	/** Invalidate the entire cache */
	invalidateAll(): void {
		this.cache.clear();
	}

	/** Current number of cached entries */
	get size(): number {
		return this.cache.size;
	}
}
