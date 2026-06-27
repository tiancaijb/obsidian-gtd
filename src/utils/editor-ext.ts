import { Decoration, DecorationSet, EditorView } from '@codemirror/view';
import { StateField, RangeSetBuilder, EditorState } from '@codemirror/state';
import { parseTaskLine } from './parser';

/** [X] checked — gray + strikethrough */
const doneDeco = Decoration.line({
	attributes: { style: 'color: #888; text-decoration: line-through; opacity: 0.7;' },
});

/** Priority A — red left border */
const priorityADeco = Decoration.line({
	attributes: { style: 'border-left: 3px solid #e74c3c;' },
});

/** Priority B — orange left border */
const priorityBDeco = Decoration.line({
	attributes: { style: 'border-left: 3px solid #e67e22;' },
});

/** Priority C — blue left border */
const priorityCDeco = Decoration.line({
	attributes: { style: 'border-left: 3px solid #3498db;' },
});

function buildDecorations(state: EditorState): DecorationSet {
	const builder = new RangeSetBuilder<Decoration>();

	for (let i = 1; i <= state.doc.lines; i++) {
		const line = state.doc.line(i);
		const task = parseTaskLine(line.text, i - 1);
		if (!task) continue;

		// Checked → done decoration
		if (task.checked) {
			builder.add(line.from, line.from, doneDeco);
		}

		// Priority decorations
		if (task.priority === 'A') {
			builder.add(line.from, line.from, priorityADeco);
		} else if (task.priority === 'B') {
			builder.add(line.from, line.from, priorityBDeco);
		} else if (task.priority === 'C') {
			builder.add(line.from, line.from, priorityCDeco);
		}
	}

	return builder.finish();
}

/**
 * CodeMirror 6 StateField that provides line decorations for GTD tasks.
 */
export const gtdDecorationField = StateField.define<DecorationSet>({
	create(state) {
		return buildDecorations(state);
	},
	update(decorations, tr) {
		if (!tr.docChanged && !tr.selection) return decorations;
		return buildDecorations(tr.state);
	},
	provide: (field) => EditorView.decorations.from(field),
});
