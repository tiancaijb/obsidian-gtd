import { Notice } from 'obsidian';
import OrgGtdPlugin from '../main';
import { AgendaView, AGENDA_VIEW_TYPE } from '../views/agenda-view';
import { STATS_VIEW_TYPE } from '../views/stats-view';
import { TIMELINE_VIEW_TYPE } from '../views/timeline-view';
import { toggleAgendaView, openOrRevealView } from '../utils/view-utils';

/**
 * Register view-related commands:
 *  - gtd-open-agenda
 *  - gtd-refresh-agenda
 *  - gtd-stats
 *  - gtd-timeline
 *  - gtd-welcome
 */
export function registerViewCommands(plugin: OrgGtdPlugin): void {
	plugin.addCommand({
		id: 'gtd-open-agenda',
		name: 'Open sidebar',
		callback: () => {
			toggleAgendaView(plugin.app.workspace);
		},
	});

	plugin.addCommand({
		id: 'gtd-refresh-agenda',
		name: 'Refresh sidebar',
		callback: () => {
			const leaves =
				plugin.app.workspace.getLeavesOfType(AGENDA_VIEW_TYPE);
			const leaf = leaves[0];
			if (leaf?.view instanceof AgendaView) {
				void leaf.view.refresh();
			}
		},
	});

	plugin.addCommand({
		id: 'gtd-stats',
		name: 'Open time statistics',
		callback: () => {
			openOrRevealView(plugin.app.workspace, STATS_VIEW_TYPE);
		},
	});

	plugin.addCommand({
		id: 'gtd-timeline',
		name: 'Open time timeline',
		callback: () => {
			openOrRevealView(plugin.app.workspace, TIMELINE_VIEW_TYPE);
		},
	});

	plugin.addCommand({
		id: 'gtd-welcome',
		name: 'Show welcome guide',
		callback: () => {
			new Notice('📋 查看设置 → GTD Workflow → 快速开始');
		},
	});
}
