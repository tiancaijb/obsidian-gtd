/**
 * Unit tests for src/utils/parser.ts
 *
 * Tests the five exported functions:
 * - isMetaLine        — detect metadata continuation lines
 * - isTaskLine        — detect GTD task list items
 * - parseTaskLine     — parse a single task line into ParsedTask
 * - parseTaskLines    — parse a task with multi-line metadata
 * - serializeTask     — serialize a ParsedTask back to Markdown
 *
 * All tested functions are pure — no mock needed.
 */
import { describe, it, expect } from 'vitest';
import {
	isMetaLine,
	isTaskLine,
	parseTaskLine,
	parseTaskLines,
	serializeTask,
} from '../../utils/parser';

// ==========================================================================
// isMetaLine
// ==========================================================================
describe('isMetaLine', () => {
	it('detects English SCHEDULED metadata line', () => {
		expect(isMetaLine('  SCHEDULED: <2026-06-28>')).toBe(true);
	});

	it('detects Chinese 计划 metadata line', () => {
		expect(isMetaLine('  计划: <2026-06-28>')).toBe(true);
	});

	it('detects English DEADLINE metadata line', () => {
		expect(isMetaLine('  DEADLINE: <2026-06-30>')).toBe(true);
	});

	it('detects Chinese 截止 metadata line', () => {
		expect(isMetaLine('  截止: <2026-06-30>')).toBe(true);
	});

	it('detects CLOSED metadata line', () => {
		expect(isMetaLine('  CLOSED: <2026-06-25>')).toBe(true);
	});

	it('detects Chinese 完成 metadata line', () => {
		expect(isMetaLine('  完成: <2026-06-25>')).toBe(true);
	});

	it('detects PRIORITY metadata line', () => {
		expect(isMetaLine('  PRIORITY: [#A]')).toBe(true);
	});

	it('detects Chinese 优先级 metadata line', () => {
		expect(isMetaLine('  优先级: [#A]')).toBe(true);
	});

	it('detects REPEAT metadata line', () => {
		expect(isMetaLine('  REPEAT: +1d')).toBe(true);
	});

	it('detects Chinese 重复 metadata line', () => {
		expect(isMetaLine('  重复: +1d')).toBe(true);
	});

	it('detects CLOCK metadata line', () => {
		expect(isMetaLine('  CLOCK: [2026-06-28 Mon 09:00]--[2026-06-28 Mon 10:00]')).toBe(true);
	});

	it('detects Chinese 计时 metadata line', () => {
		expect(isMetaLine('  计时: [2026-06-28 Mon 09:00]--[2026-06-28 Mon 10:00]')).toBe(true);
	});

	it('rejects lines without leading spaces', () => {
		expect(isMetaLine('SCHEDULED: <2026-06-28>')).toBe(false);
	});

	it('rejects empty string', () => {
		expect(isMetaLine('')).toBe(false);
	});

	it('rejects normal task lines', () => {
		expect(isMetaLine('- [ ] 写周报')).toBe(false);
	});

	it('rejects indented task lines', () => {
		expect(isMetaLine('  - [ ] 写周报')).toBe(false);
	});

	it('rejects plain text lines', () => {
		expect(isMetaLine('一些普通文本')).toBe(false);
	});
});

// ==========================================================================
// isTaskLine
// ==========================================================================
describe('isTaskLine', () => {
	it('detects standard checkbox task', () => {
		expect(isTaskLine('- [ ] 写周报')).toBe(true);
	});

	it('detects completed task', () => {
		expect(isTaskLine('- [X] 买咖啡')).toBe(true);
	});

	it('detects completed task (lowercase x)', () => {
		expect(isTaskLine('- [x] 测试')).toBe(true);
	});

	it('detects indented task', () => {
		expect(isTaskLine('  - [ ] 子任务')).toBe(true);
	});

	it('detects dash list item without checkbox', () => {
		expect(isTaskLine('- 普通列表项')).toBe(true);
	});

	it('rejects empty string', () => {
		expect(isTaskLine('')).toBe(false);
	});

	it('rejects plain text', () => {
		expect(isTaskLine('普通文本')).toBe(false);
	});

	it('rejects heading', () => {
		expect(isTaskLine('# 标题')).toBe(false);
	});

	it('rejects non-dash list items', () => {
		expect(isTaskLine('* bullet')).toBe(false);
	});

	it('rejects numbered list items', () => {
		expect(isTaskLine('1. item')).toBe(false);
	});
});

// ==========================================================================
// parseTaskLine
// ==========================================================================
describe('parseTaskLine', () => {
	it('parses a standard unchecked task', () => {
		const task = parseTaskLine('- [ ] 写周报', 0);
		expect(task).not.toBeNull();
		expect(task!.hasCheckbox).toBe(true);
		expect(task!.checked).toBe(false);
		expect(task!.text).toBe('写周报');
		expect(task!.line).toBe(0);
		expect(task!.raw).toBe('- [ ] 写周报');
		expect(task!.priority).toBeNull();
		expect(task!.scheduled).toBeNull();
		expect(task!.deadline).toBeNull();
		expect(task!.closed).toBeNull();
		expect(task!.repeat).toBeNull();
		expect(task!.metaLineCount).toBe(0);
		expect(task!.indent).toBe(0);
	});

	it('parses a completed task [X]', () => {
		const task = parseTaskLine('- [X] 买咖啡', 1);
		expect(task).not.toBeNull();
		expect(task!.checked).toBe(true);
		expect(task!.text).toBe('买咖啡');
	});

	it('parses a completed task with lowercase [x]', () => {
		const task = parseTaskLine('- [x] 测试完成', 2);
		expect(task).not.toBeNull();
		expect(task!.checked).toBe(true);
		expect(task!.text).toBe('测试完成');
	});

	it('extracts priority [#A]', () => {
		const task = parseTaskLine('- [ ] 重要任务  [#A]', 3);
		expect(task).not.toBeNull();
		expect(task!.priority).toBe('A');
		expect(task!.text).toBe('重要任务');
	});

	it('extracts priority [#B]', () => {
		const task = parseTaskLine('- [ ] 中等任务  [#B]', 4);
		expect(task).not.toBeNull();
		expect(task!.priority).toBe('B');
	});

	it('extracts priority [#C]', () => {
		const task = parseTaskLine('- [ ] 低优先级  [#C]', 5);
		expect(task).not.toBeNull();
		expect(task!.priority).toBe('C');
	});

	it('extracts SCHEDULED date (English)', () => {
		const task = parseTaskLine('- [ ] 会议  SCHEDULED: <2026-06-28>', 6);
		expect(task).not.toBeNull();
		expect(task!.scheduled).toBe('2026-06-28');
		expect(task!.text).toBe('会议');
	});

	it('extracts 计划 date (Chinese)', () => {
		const task = parseTaskLine('- [ ] 会议  计划: <2026-06-28>', 7);
		expect(task).not.toBeNull();
		expect(task!.scheduled).toBe('2026-06-28');
		expect(task!.text).toBe('会议');
	});

	it('extracts DEADLINE date (English)', () => {
		const task = parseTaskLine('- [ ] 交稿  DEADLINE: <2026-06-30>', 8);
		expect(task).not.toBeNull();
		expect(task!.deadline).toBe('2026-06-30');
		expect(task!.text).toBe('交稿');
	});

	it('extracts 截止 date (Chinese)', () => {
		const task = parseTaskLine('- [ ] 交稿  截止: <2026-06-30>', 9);
		expect(task).not.toBeNull();
		expect(task!.deadline).toBe('2026-06-30');
		expect(task!.text).toBe('交稿');
	});

	it('extracts CLOSED date (English)', () => {
		const task = parseTaskLine('- [X] 已完成  CLOSED: <2026-06-25>', 10);
		expect(task).not.toBeNull();
		expect(task!.checked).toBe(true);
		expect(task!.closed).toBe('2026-06-25');
	});

	it('extracts 完成 date (Chinese)', () => {
		const task = parseTaskLine('- [X] 已完成  完成: <2026-06-25>', 11);
		expect(task).not.toBeNull();
		expect(task!.checked).toBe(true);
		expect(task!.closed).toBe('2026-06-25');
	});

	it('extracts REPEAT (English)', () => {
		const task = parseTaskLine('- [ ] 每日站会  REPEAT: <+1d>', 12);
		expect(task).not.toBeNull();
		expect(task!.repeat).toBe('+1d');
	});

	it('extracts 重复 (Chinese)', () => {
		const task = parseTaskLine('- [ ] 每日站会  重复: <+1d>', 13);
		expect(task).not.toBeNull();
		expect(task!.repeat).toBe('+1d');
	});

	it('handles multiple metadata on one line', () => {
		const task = parseTaskLine('- [ ] 重要会议  PRIORITY: [#A]  SCHEDULED: <2026-06-28>  DEADLINE: <2026-06-30>', 14);
		expect(task).not.toBeNull();
		expect(task!.priority).toBe('A');
		expect(task!.scheduled).toBe('2026-06-28');
		expect(task!.deadline).toBe('2026-06-30');
		expect(task!.text).toBe('重要会议');
	});

	it('handles mixed Chinese/English metadata on one line', () => {
		const task = parseTaskLine('- [ ] 混合会议  PRIORITY: [#B]  计划: <2026-06-28>  DEADLINE: <2026-06-30>', 15);
		expect(task).not.toBeNull();
		expect(task!.priority).toBe('B');
		expect(task!.scheduled).toBe('2026-06-28');
		expect(task!.deadline).toBe('2026-06-30');
		expect(task!.text).toBe('混合会议');
	});

	it('strips metadata labels from cleanText', () => {
		const task = parseTaskLine('- [ ] 清理测试  SCHEDULED: <2026-06-28>  DEADLINE: <2026-06-30>  PRIORITY: [#A]', 16);
		expect(task).not.toBeNull();
		// The clean text must have no metadata keywords, no dates, no priority tags
		expect(task!.text).not.toContain('SCHEDULED');
		expect(task!.text).not.toContain('DEADLINE');
		expect(task!.text).not.toContain('PRIORITY');
		expect(task!.text).not.toContain('2026-06-28');
		expect(task!.text).not.toContain('2026-06-30');
		expect(task!.text).not.toContain('[#A]');
		expect(task!.text).toBe('清理测试');
	});

	it('parses indented task with correct indent', () => {
		const task = parseTaskLine('  - [ ] 缩进任务', 17);
		expect(task).not.toBeNull();
		expect(task!.indent).toBe(2);
		expect(task!.text).toBe('缩进任务');
	});

	it('parses deeply indented task', () => {
		const task = parseTaskLine('    - [ ] 深层嵌套', 18);
		expect(task).not.toBeNull();
		expect(task!.indent).toBe(4);
	});

	// ── Invalid inputs ──

	it('returns null for empty string', () => {
		expect(parseTaskLine('', 0)).toBeNull();
	});

	it('returns null for whitespace-only string', () => {
		expect(parseTaskLine('   ', 0)).toBeNull();
	});

	it('returns null for plain text', () => {
		expect(parseTaskLine('这是普通文本', 0)).toBeNull();
	});

	it('returns null for dash line without checkbox', () => {
		// parseTaskLine requires a checkbox — bare dash items return null
		expect(parseTaskLine('- 普通列表项', 0)).toBeNull();
	});

	it('returns null for bullet list item', () => {
		expect(parseTaskLine('* bullet', 0)).toBeNull();
	});

	it('returns null for numbered list item', () => {
		expect(parseTaskLine('1. item', 0)).toBeNull();
	});

	it('returns null for empty checkbox - [ ] at end of line', () => {
		// Without content after the checkbox, the \s+ after ] can't match
		expect(parseTaskLine('- [ ]', 0)).toBeNull();
	});

	it('returns null for malformed checkbox -[ ]', () => {
		expect(parseTaskLine('-[ ] task', 0)).toBeNull();
	});

	it('returns null for malformed checkbox - []', () => {
		expect(parseTaskLine('- [] task', 0)).toBeNull();
	});
});

// ==========================================================================
// parseTaskLines (multi-line metadata)
// ==========================================================================
describe('parseTaskLines', () => {
	it('parses a single-line task when no metadata follows', () => {
		const lines = ['- [ ] 写周报'];
		const task = parseTaskLines(lines, 0);
		expect(task).not.toBeNull();
		expect(task!.text).toBe('写周报');
		expect(task!.metaLineCount).toBe(0);
	});

	it('merges metadata from following lines', () => {
		const lines = [
			'- [ ] 重要会议',
			'  SCHEDULED: <2026-06-28>',
			'  PRIORITY: [#A]',
		];
		const task = parseTaskLines(lines, 0);
		expect(task).not.toBeNull();
		expect(task!.text).toBe('重要会议');
		expect(task!.scheduled).toBe('2026-06-28');
		expect(task!.priority).toBe('A');
		expect(task!.metaLineCount).toBe(2);
	});

	it('merges Chinese metadata from following lines', () => {
		const lines = [
			'- [ ] 中文任务',
			'  计划: <2026-06-28>',
			'  优先级: [#B]',
		];
		const task = parseTaskLines(lines, 0);
		expect(task).not.toBeNull();
		expect(task!.text).toBe('中文任务');
		expect(task!.scheduled).toBe('2026-06-28');
		expect(task!.priority).toBe('B');
		expect(task!.metaLineCount).toBe(2);
	});

	it('metadata on following lines overrides inline values', () => {
		const lines = [
			'- [ ] 会议  SCHEDULED: <2026-06-28>',
			'  DEADLINE: <2026-06-30>',
		];
		const task = parseTaskLines(lines, 0);
		expect(task).not.toBeNull();
		// Inline SCHEDULED preserved, DEADLINE added from meta line
		expect(task!.scheduled).toBe('2026-06-28');
		expect(task!.deadline).toBe('2026-06-30');
		expect(task!.metaLineCount).toBe(1);
	});

	it('metadata on following lines overrides inline values when both specify same field', () => {
		const lines = [
			'- [ ] 会议  PRIORITY: [#A]',
			'  PRIORITY: [#B]',  // overrides
		];
		const task = parseTaskLines(lines, 0);
		expect(task).not.toBeNull();
		expect(task!.priority).toBe('B');
		expect(task!.metaLineCount).toBe(1);
	});

	it('stops at a non-meta line', () => {
		const lines = [
			'- [ ] 任务',
			'  SCHEDULED: <2026-06-28>',
			'普通文本',
		];
		const task = parseTaskLines(lines, 0);
		expect(task).not.toBeNull();
		expect(task!.scheduled).toBe('2026-06-28');
		expect(task!.metaLineCount).toBe(1);
	});

	it('stops at an empty line', () => {
		const lines = [
			'- [ ] 任务',
			'  SCHEDULED: <2026-06-28>',
			'',
			'  PRIORITY: [#A]',
		];
		const task = parseTaskLines(lines, 0);
		expect(task).not.toBeNull();
		expect(task!.scheduled).toBe('2026-06-28');
		expect(task!.metaLineCount).toBe(1);
		// PRIORITY on line 3 is not included
		expect(task!.priority).toBeNull();
	});

	it('merges multiple metadata types across lines', () => {
		const lines = [
			'- [ ] 完整任务',
			'  SCHEDULED: <2026-06-28>',
			'  DEADLINE: <2026-06-30>',
			'  PRIORITY: [#A]',
			'  REPEAT: <+1w>',
		];
		const task = parseTaskLines(lines, 0);
		expect(task).not.toBeNull();
		expect(task!.scheduled).toBe('2026-06-28');
		expect(task!.deadline).toBe('2026-06-30');
		expect(task!.priority).toBe('A');
		expect(task!.repeat).toBe('+1w');
		expect(task!.metaLineCount).toBe(4);
	});

	it('returns null when startLine is out of bounds', () => {
		const lines = ['- [ ] 任务'];
		expect(parseTaskLines(lines, 5)).toBeNull();
		expect(parseTaskLines(lines, -1)).toBeNull();
	});

	it('returns null for empty lines array', () => {
		expect(parseTaskLines([], 0)).toBeNull();
	});

	it('returns null when startLine points to a non-task line', () => {
		const lines = ['普通文本'];
		expect(parseTaskLines(lines, 0)).toBeNull();
	});
});

// ==========================================================================
// serializeTask
// ==========================================================================
describe('serializeTask', () => {
	it('serializes a minimal unchecked task (Chinese)', () => {
		const task = {
			hasCheckbox: true,
			checked: false,
			text: '写周报',
			priority: null,
			scheduled: null,
			repeat: null,
			deadline: null,
			closed: null,
			line: 0,
			raw: '- [ ] 写周报',
			metaLineCount: 0,
			indent: 0,
		};
		expect(serializeTask(task, 'zh')).toBe('- [ ] 写周报');
	});

	it('serializes a minimal unchecked task (English)', () => {
		const task = {
			hasCheckbox: true,
			checked: false,
			text: 'write report',
			priority: null,
			scheduled: null,
			repeat: null,
			deadline: null,
			closed: null,
			line: 0,
			raw: '- [ ] write report',
			metaLineCount: 0,
			indent: 0,
		};
		expect(serializeTask(task, 'en')).toBe('- [ ] write report');
	});

	it('serializes a checked task', () => {
		const task = {
			hasCheckbox: true,
			checked: true,
			text: '买咖啡',
			priority: null,
			scheduled: null,
			repeat: null,
			deadline: null,
			closed: null,
			line: 0,
			raw: '- [X] 买咖啡',
			metaLineCount: 0,
			indent: 0,
		};
		expect(serializeTask(task, 'zh')).toBe('- [X] 买咖啡');
	});

	it('serializes a task with priority', () => {
		const task = {
			hasCheckbox: true,
			checked: false,
			text: '重要任务',
			priority: 'A' as const,
			scheduled: null,
			repeat: null,
			deadline: null,
			closed: null,
			line: 0,
			raw: '- [ ] 重要任务  [#A]',
			metaLineCount: 0,
			indent: 0,
		};
		expect(serializeTask(task, 'zh')).toBe('- [ ] 重要任务  [#A]');
	});

	it('serializes with SCHEDULED date (Chinese)', () => {
		const task = {
			hasCheckbox: true,
			checked: false,
			text: '会议',
			priority: null,
			scheduled: '2026-06-28',
			repeat: null,
			deadline: null,
			closed: null,
			line: 0,
			raw: '- [ ] 会议  计划: <2026-06-28>',
			metaLineCount: 0,
			indent: 0,
		};
		expect(serializeTask(task, 'zh')).toBe(
			'- [ ] 会议\n  计划: <2026-06-28>',
		);
	});

	it('serializes with SCHEDULED date (English)', () => {
		const task = {
			hasCheckbox: true,
			checked: false,
			text: 'meeting',
			priority: null,
			scheduled: '2026-06-28',
			repeat: null,
			deadline: null,
			closed: null,
			line: 0,
			raw: '- [ ] meeting  SCHEDULED: <2026-06-28>',
			metaLineCount: 0,
			indent: 0,
		};
		expect(serializeTask(task, 'en')).toBe(
			'- [ ] meeting\n  SCHEDULED: <2026-06-28>',
		);
	});

	it('serializes with all metadata fields (Chinese)', () => {
		const task = {
			hasCheckbox: true,
			checked: false,
			text: '完整任务',
			priority: 'A' as const,
			scheduled: '2026-06-28',
			repeat: '+1w',
			deadline: '2026-06-30',
			closed: null,
			line: 0,
			raw: '- [ ] 完整任务  ...',
			metaLineCount: 3,
			indent: 0,
		};
		const result = serializeTask(task, 'zh');
		expect(result).toBe(
			'- [ ] 完整任务  [#A]\n'
			+ '  计划: <2026-06-28>\n'
			+ '  重复: <+1w>\n'
			+ '  截止: <2026-06-30>',
		);
	});

	it('serializes with all metadata fields (English)', () => {
		const task = {
			hasCheckbox: true,
			checked: false,
			text: 'full task',
			priority: 'A' as const,
			scheduled: '2026-06-28',
			repeat: '+1w',
			deadline: '2026-06-30',
			closed: '2026-06-25',
			line: 0,
			raw: '- [ ] full task  ...',
			metaLineCount: 4,
			indent: 0,
		};
		const result = serializeTask(task, 'en');
		expect(result).toBe(
			'- [ ] full task  [#A]\n'
			+ '  SCHEDULED: <2026-06-28>\n'
			+ '  REPEAT: <+1w>\n'
			+ '  DEADLINE: <2026-06-30>\n'
			+ '  CLOSED: <2026-06-25>',
		);
	});

	it('preserves indent from raw line', () => {
		const task = {
			hasCheckbox: true,
			checked: false,
			text: '缩进任务',
			priority: null,
			scheduled: null,
			repeat: null,
			deadline: null,
			closed: null,
			line: 0,
			raw: '  - [ ] 缩进任务',
			metaLineCount: 0,
			indent: 2,
		};
		expect(serializeTask(task, 'zh')).toBe('  - [ ] 缩进任务');
	});

	it('serializes with CLOSED date (Chinese)', () => {
		const task = {
			hasCheckbox: true,
			checked: true,
			text: '已完成任务',
			priority: null,
			scheduled: null,
			repeat: null,
			deadline: null,
			closed: '2026-06-25',
			line: 0,
			raw: '- [X] 已完成任务  完成: <2026-06-25>',
			metaLineCount: 1,
			indent: 0,
		};
		expect(serializeTask(task, 'zh')).toBe(
			'- [X] 已完成任务\n  完成: <2026-06-25>',
		);
	});

	it('handles metadata order: scheduled before deadline before closed', () => {
		// The serialization order is deterministic: scheduled, repeat, deadline, closed
		const task = {
			hasCheckbox: true,
			checked: true,
			text: 'ordered',
			priority: null,
			scheduled: '2026-06-01',
			repeat: null,
			deadline: '2026-06-10',
			closed: '2026-06-05',
			line: 0,
			raw: '- [X] ordered',
			metaLineCount: 3,
			indent: 0,
		};
		const result = serializeTask(task, 'en');
		expect(result).toBe(
			'- [X] ordered\n'
			+ '  SCHEDULED: <2026-06-01>\n'
			+ '  DEADLINE: <2026-06-10>\n'
			+ '  CLOSED: <2026-06-05>',
		);
	});
});
