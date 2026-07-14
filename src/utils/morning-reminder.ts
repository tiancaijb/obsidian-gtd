import OrgGtdPlugin from '../main';
import { todayStr, computeNextDate } from './date-utils';
import { Notice } from 'obsidian';

/**
 * Check if it's morning and remind user about sunlight if not done yet.
 */
export async function checkMorningReminder(plugin: OrgGtdPlugin): Promise<void> {
	const { settings } = plugin;
	if (!settings.morningReminderEnabled) return;

	const now = new Date();
	const minutes = now.getHours() * 60 + now.getMinutes();
	if (minutes < settings.morningReminderStart || minutes > settings.morningReminderEnd) return;

	const filePath = settings.inboxPath;
	try {
		const content = await plugin.app.vault.adapter.read(filePath);
		const today = now.toISOString().slice(0, 10);
		if (content.includes('DONE 走出房间门') && content.includes(today)) return;
		if (content.includes('走出房间门')) return;

		const reminder = new Notice('☀️ 走出房间门了吗？', 10000);
		reminder.messageEl.onclick = async () => {
			try {
				const lines = content.split('\n');
				for (let i = 0; i < lines.length; i++) {
					if (lines[i]!.includes('走出房间门') && lines[i]!.includes('[ ]')) {
						lines[i] = lines[i]!.replace('[ ]', '[X]');
						for (let j = i + 1; j < lines.length && lines[j]!.match(/^\s+/); j++) {
							const m = lines[j]!.match(/SCHEDULED:\s*<([^>]+)>/i);
							const rm = lines[j]!.match(/REPEAT:\s*<([^>]+)>/i);
							if (m && rm) {
								const next = computeNextDate(todayStr(), rm[1]!);
								if (next) lines[j] = lines[j]!.replace(/<[^>]+>/, `<${next}>`);
							}
						}
						break;
					}
				}
				await plugin.app.vault.adapter.write(filePath, lines.join('\n'));
				new Notice('✅ 已标记');
			} catch (_e) { void _e; }
		};
	} catch (_e) { void _e; }
}
