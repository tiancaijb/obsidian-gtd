import { Priority, ParsedTask } from '../models/task';
import { Lang, metaKeywords } from './i18n';

// All metadata keywords (both languages) — hardcoded to avoid module load order issues
const KW_RAW = [
	'SCHEDULED', 'DEADLINE', 'CLOSED', 'LOGGED', 'CLOCK', 'PRIORITY',
	'\u8BA1\u5212', '\u622A\u6B62', '\u5B8C\u6210', '\u65E5\u5FD7', '\u8BA1\u65F6', '\u4F18\u5148\u7EA7',
];
const KW = KW_RAW.join('|');

/**
 * Regex to match date markers in any language:  SCHEDULED: <date>  计划: <date>
 */
const DATE_MARKER_RE = new RegExp(`(${KW}):\\s*<([^>]+)>`, 'gi');

/**
 * Regex to match priority tag:  [#A]  [#B]  [#C]
 */
const PRIORITY_RE = /\[#([ABC])\]/;

/**
 * Regex to match list item start.
 */
const LIST_ITEM_RE = /^(\s*)(?:-\s+(?:\[([ xX])\]\s+)?)/;

/**
 * Regex to clean metadata labels from text.
 */
const LABEL_CLEANUP_RE = new RegExp(`\\b(${KW}|PRIORITY|优先级):\\s*`, 'gi');

/**
 * Check if a line is a metadata continuation.
 */
export function isMetaLine(line: string): boolean {
	return new RegExp(`^  (${KW}|PRIORITY|优先级|CLOCK|计时):`).test(line.trimEnd());
}

/**
 * Check if a line could be a GTD task list item.
 */
export function isTaskLine(line: string): boolean {
	return /^\s*-\s/.test(line.trimEnd());
}

/**
 * Parse metadata from joined text.
 */
function extractMetadata(text: string): {
	priority: Priority | null;
	scheduled: string | null;
	deadline: string | null;
	closed: string | null;
	cleanText: string;
} {
	let scheduled: string | null = null;
	let deadline: string | null = null;
	let closed: string | null = null;

	DATE_MARKER_RE.lastIndex = 0;
	let m: RegExpExecArray | null;
	while ((m = DATE_MARKER_RE.exec(text)) !== null) {
		const key = m[1]!.toLowerCase();
		const dateStr = m[2]!;
		const cleanDate = dateStr.split(/\s+/)[0]!;
		if (/scheduled|计划/.test(key)) scheduled = cleanDate;
		else if (/deadline|截止/.test(key)) deadline = cleanDate;
		else if (/closed|完成/.test(key)) closed = cleanDate;
	}

	const priorityMatch = text.match(PRIORITY_RE);
	const priority: Priority | null = priorityMatch
		? (priorityMatch[1] as Priority)
		: null;

	let cleanText = text;
	cleanText = cleanText.replace(DATE_MARKER_RE, '');
	cleanText = cleanText.replace(PRIORITY_RE, '');
	cleanText = cleanText.replace(LABEL_CLEANUP_RE, '');
	cleanText = cleanText.trim();

	return { priority, scheduled, deadline, closed, cleanText };
}

/**
 * Parse a single task line.
 */
export function parseTaskLine(line: string, lineNumber: number): ParsedTask | null {
	const trimmed = line.trimEnd();
	const listMatch = trimmed.match(LIST_ITEM_RE);
	if (!listMatch) return null;

	const hasCheckbox = listMatch[2] !== undefined;
	const checked = listMatch[2] === 'X' || listMatch[2] === 'x';
	if (!hasCheckbox) return null;

	const afterMarker = trimmed.slice(listMatch[0].length);
	const { priority, scheduled, deadline, closed, cleanText } = extractMetadata(afterMarker);
	const indent = listMatch[1]?.length ?? 0;

	return {
		hasCheckbox, checked, text: cleanText,
		priority, scheduled, deadline, closed,
		line: lineNumber, raw: line, metaLineCount: 0, indent,
	};
}

/**
 * Parse a task with multi-line metadata.
 */
export function parseTaskLines(lines: string[], startLine: number): ParsedTask | null {
	const taskLine = lines[startLine];
	if (!taskLine) return null;

	const task = parseTaskLine(taskLine, startLine);
	if (!task) return null;

	let metaCount = 0;
	let metaText = '';
	let i = startLine + 1;
	while (i < lines.length && isMetaLine(lines[i]!)) {
		const ml = lines[i]!.trimEnd();
		metaText += ' ' + ml;
		metaCount++;
		i++;
	}

	if (metaCount > 0) {
		const { priority, scheduled, deadline, closed } = extractMetadata(metaText);
		if (priority !== null) task.priority = priority;
		if (scheduled !== null) task.scheduled = scheduled;
		if (deadline !== null) task.deadline = deadline;
		if (closed !== null) task.closed = closed;
	}

	task.metaLineCount = metaCount;
	return task;
}

/**
 * Serialize a task with localized metadata keywords.
 */
export function serializeTask(task: ParsedTask, lang: Lang = 'zh'): string {
	const indent = task.raw.match(/^(\s*)/)?.[1] || '';

	let line = `${indent}- `;
	line += task.checked ? '[X] ' : '[ ] ';
	line += task.text;
	if (task.priority) line += `  [#${task.priority}]`;

	const kw = metaKeywords[lang]!;
	const metaLines: string[] = [];
	if (task.scheduled) metaLines.push(`  ${kw.scheduled}: <${task.scheduled}>`);
	if (task.deadline) metaLines.push(`  ${kw.deadline}: <${task.deadline}>`);
	if (task.closed) metaLines.push(`  ${kw.closed}: <${task.closed}>`);

	if (metaLines.length > 0) {
		return line + '\n' + metaLines.join('\n');
	}
	return line;
}
