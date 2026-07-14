import { Editor, Notice } from 'obsidian';
import { parseTaskLines, serializeTask, isTaskLine, isMetaLine } from './parser';
import { ParsedTask } from '../models/task';
import { Lang, t } from './i18n';

/**
 * Modify the task on the current editor line.
 * Applies the `modify` callback to the parsed task, serializes the result,
 * and replaces the task + its metadata lines in the editor buffer.
 *
 * @param editor  The CodeMirror editor instance.
 * @param modify  Callback that receives a ParsedTask and returns the modified version.
 * @param lang    Language for metadata keyword serialization.
 */
export function modifyCurrentLine(
	editor: Editor,
	modify: (task: ParsedTask) => ParsedTask,
	lang: Lang,
): void {
	const cursor = editor.getCursor();
	const lines = editor.getValue().split('\n');
	const task = parseTaskLines(lines, cursor.line);
	if (!task) {
		new Notice('Not a GTD task (need - [ ] format)');
		return;
	}

	const serialized = serializeTask(modify(task), lang);
	const serializedLines = serialized.split('\n');

	const replaceStart = cursor.line;
	const replaceEnd = replaceStart + task.metaLineCount;
	lines.splice(replaceStart, replaceEnd - replaceStart + 1, ...serializedLines);
	editor.setValue(lines.join('\n'));

	const newLine = Math.min(replaceStart, lines.length - 1);
	editor.setCursor({ line: newLine, ch: cursor.ch });
}

/**
 * Adjust the indent level of the task block at the cursor.
 * Positive delta indents right (demote), negative delta outdents (promote).
 * Operates on the task line plus any following metadata lines and
 * subtasks with greater indent (org-mode-style block indent).
 *
 * @param editor  The CodeMirror editor instance.
 * @param delta   Indent change in number of spaces (e.g. +2 to indent, -2 to outdent).
 * @param lang    Language for UI notice.
 */
export function adjustIndent(editor: Editor, delta: number, lang: Lang): void {
	const cursor = editor.getCursor();
	const lines = editor.getValue().split('\n');
	const lineText = lines[cursor.line];
	if (!lineText) return;

	if (!isTaskLine(lineText)) {
		new Notice('Not a task line');
		return;
	}

	// Current indent
	const match = lineText.match(/^(\s*)/);
	const currentIndent = match?.[1]?.length ?? 0;
	const newIndent = Math.max(0, currentIndent + delta);
	if (newIndent === currentIndent) return;

	// Find the block: this task + its meta lines + any subtasks with MORE indent
	const baseIndent = currentIndent;
	let blockEnd = cursor.line;

	for (let i = cursor.line + 1; i < lines.length; i++) {
		const l = lines[i];
		if (l === undefined) break;
		if (isTaskLine(l)) {
			const indent = l.match(/^(\s*)/)?.[1]?.length ?? 0;
			if (indent <= baseIndent) break; // peer or parent — stop
		} else if (!isMetaLine(l)) {
			break; // non-task, non-meta — stop
		}
		blockEnd = i;
	}

	// Adjust indent for all lines in the block
	const indentDiff = newIndent - currentIndent;
	for (let i = cursor.line; i <= blockEnd; i++) {
		const l = lines[i];
		if (l === undefined) continue;
		const leading = l.match(/^(\s*)/)?.[1] ?? '';
		lines[i] = l.slice(leading.length);
		const newLeading =
			leading.length + indentDiff >= 0
				? ' '.repeat(leading.length + indentDiff)
				: '';
		lines[i] = newLeading + (lines[i] ?? '');
	}

	editor.setValue(lines.join('\n'));
	// Keep cursor position (shift with indent change)
	const newCh = Math.max(0, cursor.ch + indentDiff);
	editor.setCursor({ line: cursor.line, ch: newCh });
	new Notice(t(delta < 0 ? 'promoted' : 'demoted', lang));
}
