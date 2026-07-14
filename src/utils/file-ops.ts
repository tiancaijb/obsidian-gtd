import { Notice, Plugin } from 'obsidian';
import { parseTaskLines } from './parser';
import { formatClockLine } from './timer';
import { Lang, gtdFilenames } from './i18n';

/**
 * Append a CLOCK record to a task in a file.
 */
export async function appendClockLog(
	plugin: Plugin,
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

/**
 * Ensure GTD folder structure exists (base folder + per-file markdown files).
 * Returns the inbox file path.
 */
export async function ensureGtdFolders(
	plugin: Plugin,
	settings: { gtdFolder: string; inboxPath: string },
): Promise<string> {
	const base = settings.gtdFolder;

	// Ensure base folder exists
	try {
		if (!(await plugin.app.vault.adapter.exists(base))) {
			await plugin.app.vault.createFolder(base);
		}
	} catch (e) {
		console.warn('Failed to create GTD base folder:', e);
	}

	// Create GTD files with combined English-Chinese names
	for (const fname of Object.values(gtdFilenames)) {
		const filePath = `${base}/${fname}.md`;
		try {
			if (!(await plugin.app.vault.adapter.exists(filePath))) {
				await plugin.app.vault.create(filePath, '\n');
			}
		} catch (e) {
			console.warn(`Failed to create GTD file "${filePath}":`, e);
		}
	}

	return `${base}/${gtdFilenames.inbox}.md`;
}
