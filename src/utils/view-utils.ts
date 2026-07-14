import { Workspace } from 'obsidian';
import { AGENDA_VIEW_TYPE } from '../views/agenda-view';

export function toggleAgendaView(workspace: Workspace) {
	const leaves = workspace.getLeavesOfType(AGENDA_VIEW_TYPE);
	const leaf = leaves[0];
	if (leaf) {
		leaf.detach();
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
	const existingLeaf = existing[0];
	if (existingLeaf) {
		void workspace.revealLeaf(existingLeaf);
	} else {
		const leaf = workspace.getRightLeaf(false);
		if (leaf) {
			void leaf.setViewState({ type: viewType });
			void workspace.revealLeaf(leaf);
		}
	}
}
