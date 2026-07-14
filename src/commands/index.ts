import OrgGtdPlugin from '../main';
import { registerTaskCommands } from './task-commands';
import { registerTimerCommands } from './timer-commands';
import { registerViewCommands } from './view-commands';

/**
 * Register all GTD commands on the plugin instance.
 * Called once during plugin.onload().
 */
export function registerCommands(plugin: OrgGtdPlugin): void {
	registerTaskCommands(plugin);
	registerTimerCommands(plugin);
	registerViewCommands(plugin);
}
