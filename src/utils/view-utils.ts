import { Workspace } from 'obsidian';
import { AGENDA_VIEW_TYPE } from '../views/agenda-view';
import { TIMELINE_VIEW_TYPE } from '../views/timeline-view';
import { STATS_VIEW_TYPE } from '../views/stats-view';

export function toggleAgendaView(workspace: Workspace) {
	const leaves = workspace.getLeavesOfType(AGENDA_VIEW_TYPE);
	if (leaves.length > 0) {
		leaves[0]!.detach();
	} else {
		void activateAgendaView(workspace);
	}
}

export async function activateAgendaView(workspace: Workspace) {
	const leaf = workspace.getRightLeaf(false);
	if (!leaf) return;
	await leaf.setViewState({ type: AGENDA_VIEW_TYPE, active: true });
	void workspace.revealLeaf(leaf);
}

export function openOrRevealView(workspace: Workspace, viewType: string) {
	const existing = workspace.getLeavesOfType(viewType);
	if (existing.length > 0) {
		void workspace.revealLeaf(existing[0]!);
	} else {
		const leaf = workspace.getRightLeaf(false);
		if (leaf) {
			void leaf.setViewState({ type: viewType });
			void workspace.revealLeaf(leaf);
		}
	}
}
