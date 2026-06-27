/**
 * Parse CLOCK / 计时 records from task files.
 * Format:   CLOCK: [2026-06-27 Sat 10:00]--[2026-06-27 Sat 10:25] => 0:25
 */

export interface ClockRecord {
	start: Date;
	end: Date;
	durationMin: number;
	keyword: string;
}

const CLOCK_RE = /^\s{2}(CLOCK|计时):\s*\[([^\]]+)\]--\[([^\]]+)\]\s*=>\s*(\d+):(\d+)/;

/**
 * Parse a single CLOCK line. Returns null if not a valid CLOCK line.
 */
export function parseClockLine(line: string): ClockRecord | null {
	const m = CLOCK_RE.exec(line);
	if (!m) return null;

	const start = parseClockDate(m[2]!);
	const end = parseClockDate(m[3]!);
	if (!start || !end) return null;

	const h = parseInt(m[4]!);
	const min = parseInt(m[5]!);

	return { start, end, durationMin: h * 60 + min, keyword: m[1]! };
}

/**
 * Parse a clock date/time string: "2026-06-27 Sat 10:00"
 */
function parseClockDate(s: string): Date | null {
	// Strip the day name: "2026-06-27 Sat 10:00" -> "2026-06-27 10:00"
	const cleaned = s.replace(/\s+[A-Za-z]{3}\s+/, ' ');
	const d = new Date(cleaned);
	if (isNaN(d.getTime())) return null;
	return d;
}

/**
 * Extract all CLOCK records from an array of lines.
 */
export function extractClockRecords(lines: string[]): ClockRecord[] {
	const records: ClockRecord[] = [];
	for (const line of lines) {
		const r = parseClockLine(line);
		if (r) records.push(r);
	}
	return records;
}

/**
 * Filter records by date (same year-month-day).
 */
export function filterByDate(records: ClockRecord[], dateStr: string): ClockRecord[] {
	return records.filter((r) => {
		const y = r.start.getFullYear();
		const m = String(r.start.getMonth() + 1).padStart(2, '0');
		const d = String(r.start.getDate()).padStart(2, '0');
		return `${y}-${m}-${d}` === dateStr;
	});
}

/**
 * Calculate total minutes from an array of records.
 */
export function totalMinutes(records: ClockRecord[]): number {
	return records.reduce((sum, r) => sum + r.durationMin, 0);
}

/**
 * Format minutes to human-readable string (e.g. "2h 30m").
 */
export function formatDuration(totalMin: number): string {
	if (totalMin === 0) return '<1m';
	const h = Math.floor(totalMin / 60);
	const m = totalMin % 60;
	if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
	return `${m}m`;
}
