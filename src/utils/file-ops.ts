import { Notice } from 'obsidian';
import OrgGtdPlugin from '../main';
import { parseTaskLines } from './parser';
import { formatClockLine } from './timer';
import { Lang } from './i18n';

/**
 * Append a CLOCK record to a task in a file.
 */
export async function appendClockLog(
	plugin: OrgGtdPlugin,
	filePath: string,
	line: number,
	start: Date,
	end: Date,
	lang: Lang,
): Promise<void> {
	try {
		const content = await plugin.app.vault.adapter.read(filePath);
		const lines = content.split('\n');
		const task = parseTaskLines(lines, line);
		if (!task) return;

		const clockKw = lang === 'zh' ? '计时' : 'CLOCK';
		const clockLine = formatClockLine(start, end, clockKw);
		const insertAt = line + task.metaLineCount + 1;
		lines.splice(insertAt, 0, clockLine);
		await plugin.app.vault.adapter.write(filePath, lines.join('\n'));

		// Notify views to refresh — handled by caller via settings/view access
	} catch (e) {
		console.warn('Failed to append clock log:', e);
		new Notice('Failed to save clock record');
	}
}
