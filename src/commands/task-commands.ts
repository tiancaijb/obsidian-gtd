import { Editor, MarkdownView, Notice } from 'obsidian';
import OrgGtdPlugin from '../main';
import { parseTaskLine } from '../utils/parser';
import { Priority } from '../models/task';
import { modifyCurrentLine, adjustIndent } from '../utils/editor-utils';
import { computeNextDate, todayStr } from '../utils/date-utils';
import { DatePickerModal } from '../views/date-picker-modal';
import { CaptureModal } from '../views/capture-modal';

const PRIORITIES: (Priority | null)[] = ['A', 'B', 'C', null];

// ── Lazy callback implementations ───────────────────────────────────────

function toggleCheckbox(plugin: OrgGtdPlugin): void {
	const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
	if (!view) {
		new Notice('No active editor');
		return;
	}
	modifyCurrentLine(
		view.editor,
		(task) => {
			task.checked = !task.checked;

			if (task.checked && task.repeat) {
				// Repeat from today (like org-mode <.SCHEDULED: <.>)
				const next = computeNextDate(todayStr(), task.repeat);
				if (next) task.scheduled = next;
				task.checked = false;
				task.closed = null;
			} else {
				task.closed = task.checked
					? new Date().toISOString().slice(0, 10)
					: null;
			}

			return task;
		},
		plugin.settings.lang,
	);
}

function cyclePriority(editor: Editor, plugin: OrgGtdPlugin): void {
	modifyCurrentLine(
		editor,
		(task) => {
			const idx = PRIORITIES.indexOf(task.priority);
			task.priority =
				PRIORITIES[(idx + 1) % PRIORITIES.length] ?? null;
			return task;
		},
		plugin.settings.lang,
	);
}

function cyclePriorityDown(editor: Editor, plugin: OrgGtdPlugin): void {
	modifyCurrentLine(
		editor,
		(task) => {
			const idx = PRIORITIES.indexOf(task.priority);
			task.priority =
				PRIORITIES[
					(idx - 1 + PRIORITIES.length) % PRIORITIES.length
				] ?? null;
			return task;
		},
		plugin.settings.lang,
	);
}

/** Shared helper: open a date-picker modal and apply the chosen date to a task field. */
async function setDateField(
	plugin: OrgGtdPlugin,
	field: 'scheduled' | 'deadline',
	label: string,
): Promise<void> {
	const view = plugin.app.workspace.getActiveViewOfType(MarkdownView);
	if (!view) {
		new Notice('No active editor');
		return;
	}
	const task = parseTaskLine(
		view.editor.getLine(view.editor.getCursor().line),
		0,
	);
	if (!task) {
		new Notice('Not a gtd task');
		return;
	}

	const initialDate = field === 'scheduled' ? task.scheduled : task.deadline;
	const modal = new DatePickerModal(
		plugin.app,
		label,
		initialDate,
		plugin.settings.lang,
	);
	modal.open();
	const result = await modal.waitForResult();
	if (!result) return;

	modifyCurrentLine(
		view.editor,
		(t) => {
			if (field === 'scheduled') {
				t.scheduled = result === 'remove' ? null : result;
			} else {
				t.deadline = result === 'remove' ? null : result;
			}
			return t;
		},
		plugin.settings.lang,
	);
}

async function setScheduled(plugin: OrgGtdPlugin): Promise<void> {
	return setDateField(plugin, 'scheduled', 'Set SCHEDULED');
}

async function setDeadline(plugin: OrgGtdPlugin): Promise<void> {
	return setDateField(plugin, 'deadline', 'Set DEADLINE');
}

function promote(editor: Editor, plugin: OrgGtdPlugin): void {
	adjustIndent(editor, -2, plugin.settings.lang);
}

function demote(editor: Editor, plugin: OrgGtdPlugin): void {
	adjustIndent(editor, 2, plugin.settings.lang);
}

function insertTask(editor: Editor): void {
	editor.replaceSelection('- [ ] ');
}

function quickCapture(plugin: OrgGtdPlugin): void {
	new CaptureModal(
		plugin.app,
		plugin.settings.inboxPath,
		plugin.settings.lang,
	).open();
}

// ── Registration ────────────────────────────────────────────────────────

/**
 * Register all task-editing commands:
 *  - gtd-toggle-checkbox
 *  - gtd-cycle-priority / gtd-cycle-priority-down
 *  - gtd-set-scheduled / gtd-set-deadline
 *  - gtd-promote / gtd-demote
 *  - gtd-insert-task
 *  - gtd-quick-capture
 *
 * Each command callback is a standalone function for lazy execution.
 */
export function registerTaskCommands(plugin: OrgGtdPlugin): void {
	plugin.addCommand({
		id: 'gtd-toggle-checkbox',
		name: 'Toggle task checkbox',
		callback: () => { toggleCheckbox(plugin); },
	});

	plugin.addCommand({
		id: 'gtd-cycle-priority',
		name: 'Cycle priority up (A to B to C to none)',
		editorCallback: (editor: Editor) => { cyclePriority(editor, plugin); },
	});

	plugin.addCommand({
		id: 'gtd-cycle-priority-down',
		name: 'Cycle priority down (none to C to B to A)',
		editorCallback: (editor: Editor) => { cyclePriorityDown(editor, plugin); },
	});

	plugin.addCommand({
		id: 'gtd-set-scheduled',
		name: 'Set scheduled date',
		callback: () => { void setScheduled(plugin); },
	});

	plugin.addCommand({
		id: 'gtd-set-deadline',
		name: 'Set deadline date',
		callback: () => { void setDeadline(plugin); },
	});

	// --- Promote / Demote (org-mode style) ---

	plugin.addCommand({
		id: 'gtd-promote',
		name: 'Promote task (reduce indent)',
		editorCallback: (editor: Editor) => { promote(editor, plugin); },
	});

	plugin.addCommand({
		id: 'gtd-demote',
		name: 'Demote task (increase indent)',
		editorCallback: (editor: Editor) => { demote(editor, plugin); },
	});

	// --- Insert task checkbox ---
	plugin.addCommand({
		id: 'gtd-insert-task',
		name: 'Insert task: - [ ]',
		editorCallback: (editor: Editor) => { insertTask(editor); },
	});

	// --- Quick Capture (from anywhere) ---
	plugin.addCommand({
		id: 'gtd-quick-capture',
		name: 'Quick capture',
		callback: () => { quickCapture(plugin); },
	});
}
