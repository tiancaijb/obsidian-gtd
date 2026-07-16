import { TFile } from 'obsidian';
import { ParsedTask } from '../models/task';

export const AGENDA_VIEW_TYPE = 'gtd-agenda';

export interface TimerAPI {
	start: (path: string, line: number) => void;
	pause: () => unknown;
	resume: () => unknown;
	stop: () => { elapsedMs: number; startDate: Date; endDate: Date } | null;
	getCurrent: () => { filePath: string; line: number; running: boolean } | null;
	getElapsed: () => number;
	stopAndLog: (path: string, line: number) => void;
}

/** Group tier for lazy rendering priority. */
export type GroupTier = 'today' | 'thisWeek' | 'thisMonth' | 'future' | 'noDate';

export interface TaskEntry {
	task: ParsedTask;
	file: TFile;
	date: string;
	dateType: 'scheduled' | 'deadline' | 'closed' | '';
}
