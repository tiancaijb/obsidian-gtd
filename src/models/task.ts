/**
 * Task data model for GTD in Obsidian.
 *
 * Line format (Markdown checkbox style):
 *   - [ ] 写周报  PRIORITY: [#A]  SCHEDULED: <2026-06-28>
 *   - [X] 买咖啡  CLOSED: <2026-06-26>
 *   - [X] 废弃任务  CLOSED: <2026-06-25>
 */

export type Priority = 'A' | 'B' | 'C';

export interface ParsedTask {
	/** Whether a checkbox `[ ]` / `[X]` is present */
	hasCheckbox: boolean;
	/** Checkbox checked state (true = [X]) */
	checked: boolean;
	/** A/B/C or null */
	priority: Priority | null;
	/** Pure task text (without metadata markers) */
	text: string;
	/** SCHEDULED date (YYYY-MM-DD) */
	scheduled: string | null;
	/** Repeat interval (e.g. +1d, +2d, +1w) */
	repeat: string | null;
	/** DEADLINE date (YYYY-MM-DD) */
	deadline: string | null;
	/** CLOSED date (YYYY-MM-DD) */
	closed: string | null;
	/** 0-indexed line number in file */
	line: number;
	/** Original raw line */
	raw: string;
	/** Number of metadata lines following the task line (PRIORITY/SCHEDULED/etc) */
	metaLineCount: number;
	/** Indent level (number of leading spaces) */
	indent: number;
}
