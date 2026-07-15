/**
 * File content cache for GTD plugin views.
 *
 * Caches file contents to avoid redundant vault.read() calls during
 * repeated view refreshes. The cache is invalidated via vault events
 * (modify, create, delete, rename) — managed by the plugin in main.ts.
 *
 * The dirty flag tracks whether any file has changed since the last
 * full scan. Views can check isDirty() to decide whether a full
 * re-scan is needed, and use getOrRead() for content-level caching
 * even when the file list must be re-fetched.
 *
 * This class has no Obsidian dependencies beyond the Vault type —
 * safe to import without mocking for unit tests.
 */

import { TFile, Vault } from 'obsidian';

export class FileCache {
	private cache = new Map<string, string>();
	private gtdPrefix: string;
	private dirty = true;

	constructor(gtdPrefix: string) {
		this.gtdPrefix = gtdPrefix;
	}

	// ── Dirty flag ───────────────────────────────────────────────────────

	/** Check if cache needs refresh (file changes since last scan) */
	isDirty(): boolean {
		return this.dirty;
	}

	/** Mark cache as clean (after a full scan) */
	markClean(): void {
		this.dirty = false;
	}

	/** Force full re-scan on next access */
	markDirty(): void {
		this.dirty = true;
	}

	// ── Invalidation ─────────────────────────────────────────────────────

	/** Invalidate a specific file's cached content */
	invalidate(path: string): void {
		this.cache.delete(path);
		this.dirty = true;
	}

	/** Invalidate the entire cache (file list + content) */
	invalidateAll(): void {
		this.cache.clear();
		this.dirty = true;
	}

	// ── Read / cache ─────────────────────────────────────────────────────

	/**
	 * Get cached content for a file, or read from vault and cache the result.
	 * The cache stores content by file path.
	 */
	async getOrRead(file: TFile, vault: Vault): Promise<string> {
		const existing = this.cache.get(file.path);
		if (existing !== undefined) return existing;
		const content = await vault.read(file);
		this.cache.set(file.path, content);
		return content;
	}

	// ── Prefix management ────────────────────────────────────────────────

	/** Update the GTD folder prefix and invalidate if changed */
	setGtdPrefix(prefix: string): void {
		if (prefix !== this.gtdPrefix) {
			this.gtdPrefix = prefix;
			this.invalidateAll();
		}
	}

	getGtdPrefix(): string {
		return this.gtdPrefix;
	}
}
