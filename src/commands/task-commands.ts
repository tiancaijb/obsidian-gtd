import { Editor, MarkdownView, Notice } from 'obsidian';
import OrgGtdPlugin from '../main';
import { parseTaskLine } from '../utils/parser';
import { t } from '../utils/i18n';
import { Priority } from '../models/task';
import { modifyCurrentLine, adjustIndent } from '../utils/editor-utils';
import { computeNextDate, todayStr } from '../utils/date-utils';
import { DatePickerModal } from '../views/date-picker-modal';
import { CaptureModal } from '../views/capture-modal';

const PRIORITIES: (Priority | null)[] = ['A', 'B', 'C', null];

/**
 * Register all task-editing commands:
 *  - gtd-toggle-checkbox
 *  - gtd-cycle-priority / gtd-cycle-priority-down
 *  - gtd-set-scheduled / gtd-set-deadline
 *  - gtd-promote / gtd-demote
 *  - gtd-insert-task
 *  - gtd-quick-capture
 */
export function registerTaskCommands(plugin: OrgGtdPlugin): void {
	const lang = () => plugin.settings.lang;

	plugin.addCommand({
		id: 'gtd-toggle-checkbox',
		name: 'Toggle task checkbox',
		callback: () => {
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
				lang(),
			);
		},
	});

	plugin.addCommand({
		id: 'gtd-cycle-priority',
		name: 'Cycle priority up (A to B to C to none)',
		editorCallback: (editor: Editor) => {
			modifyCurrentLine(
				editor,
				(task) => {
					const idx = PRIORITIES.indexOf(task.priority);
					task.priority =
						PRIORITIES[(idx + 1) % PRIORITIES.length] ?? null;
					return task;
				},
				lang(),
			);
		},
	});

	plugin.addCommand({
		id: 'gtd-cycle-priority-down',
		name: 'Cycle priority down (none to C to B to A)',
		editorCallback: (editor: Editor) => {
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
				lang(),
			);
		},
	});

	plugin.addCommand({
		id: 'gtd-set-scheduled',
		name: 'Set scheduled date',
		callback: async () => {
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

			const modal = new DatePickerModal(
				plugin.app,
				'Set SCHEDULED',
				task.scheduled,
				lang(),
			);
			modal.open();
			const result = await modal.waitForResult();
			if (!result) return;

			modifyCurrentLine(
				view.editor,
				(t) => {
					t.scheduled = result === 'remove' ? null : result;
					return t;
				},
				lang(),
			);
		},
	});

	plugin.addCommand({
		id: 'gtd-set-deadline',
		name: 'Set deadline date',
		callback: async () => {
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

			const modal = new DatePickerModal(
				plugin.app,
				'Set DEADLINE',
				task.deadline,
				lang(),
			);
			modal.open();
			const result = await modal.waitForResult();
			if (!result) return;

			modifyCurrentLine(
				view.editor,
				(t) => {
					t.deadline = result === 'remove' ? null : result;
					return t;
				},
				lang(),
			);
		},
	});

	// --- Promote / Demote (org-mode style) ---

	plugin.addCommand({
		id: 'gtd-promote',
		name: 'Promote task (reduce indent)',
		editorCallback: (editor: Editor) => {
			adjustIndent(editor, -2, lang());
		},
	});

	plugin.addCommand({
		id: 'gtd-demote',
		name: 'Demote task (increase indent)',
		editorCallback: (editor: Editor) => {
			adjustIndent(editor, 2, lang());
		},
	});

	// --- Insert task checkbox ---
	plugin.addCommand({
		id: 'gtd-insert-task',
		name: 'Insert task: - [ ]',
		editorCallback: (editor: Editor) => {
			editor.replaceSelection('- [ ] ');
		},
	});

	// --- Quick Capture (from anywhere) ---
	plugin.addCommand({
		id: 'gtd-quick-capture',
		name: 'Quick capture',
		callback: () => {
			new CaptureModal(
				plugin.app,
				plugin.settings.inboxPath,
				lang(),
			).open();
		},
	});
}
