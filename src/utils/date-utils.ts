/**
 * Date utility functions for GTD tasks.
 */

/**
 * Format a Date object to YYYY-MM-DD string.
 */
export function formatDate(date: Date): string {
	const y = date.getFullYear();
	const m = String(date.getMonth() + 1).padStart(2, '0');
	const d = String(date.getDate()).padStart(2, '0');
	return `${y}-${m}-${d}`;
}

/**
 * Parse a YYYY-MM-DD string to Date. Returns null if invalid.
 */
export function parseDate(str: string): Date | null {
	const d = new Date(str);
	if (isNaN(d.getTime())) return null;
	return d;
}

/**
 * Get today's date string in YYYY-MM-DD.
 */
export function todayStr(): string {
	return formatDate(new Date());
}

/**
 * Compare two date strings (YYYY-MM-DD). Returns:
 * - negative if a < b
 * - 0 if a === b
 * - positive if a > b
 */
export function compareDates(a: string, b: string): number {
	if (a < b) return -1;
	if (a > b) return 1;
	return 0;
}

/**
 * Returns true if dateStr is today.
 */
export function isToday(dateStr: string): boolean {
	return dateStr === todayStr();
}

/**
 * Returns true if dateStr is within N days from today (inclusive).
 */
export function isWithinDays(dateStr: string, days: number): boolean {
	const date = parseDate(dateStr);
	if (!date) return false;

	const now = new Date();
	now.setHours(0, 0, 0, 0);

	const end = new Date(now);
	end.setDate(now.getDate() + days);
	end.setHours(23, 59, 59, 999);

	return date >= now && date <= end;
}

/**
 * Returns true if dateStr is beyond N days from today.
 */
export function isBeyond(dateStr: string, days: number): boolean {
	const date = parseDate(dateStr);
	if (!date) return false;

	const now = new Date();
	now.setHours(0, 0, 0, 0);
	const cutoff = new Date(now);
	cutoff.setDate(now.getDate() + days);
	cutoff.setHours(23, 59, 59, 999);

	return date > cutoff;
}

/**
 * Convert settings weekStartDay (1=Mon ... 7=Sun) to Date.getDay() value (0=Sun ... 6=Sat).
 */
function settingsToDay(weekStartDay: number): number {
	return weekStartDay % 7;
}

/**
 * Returns the start-of-week date for a given date.
 * weekStartDay: 1=Monday ... 7=Sunday.
 */
export function getWeekStart(date: Date, weekStartDay: number): Date {
	const d = new Date(date);
	const wd = settingsToDay(weekStartDay);
	const day = d.getDay();
	const diff = (day - wd + 7) % 7;
	d.setDate(d.getDate() - diff);
	d.setHours(0, 0, 0, 0);
	return d;
}

/**
 * Returns true if dateStr falls in the same calendar week as today.
 */
export function isThisWeek(dateStr: string, weekStartDay: number): boolean {
	const date = parseDate(dateStr);
	if (!date) return false;
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const ws = getWeekStart(date, weekStartDay);
	const wst = getWeekStart(today, weekStartDay);
	return ws.getTime() === wst.getTime();
}

/**
 * Returns the start date of the calendar-month period for a given date.
 * monthStartDay: day-of-month that starts a new period (1..28).
 */
export function getMonthPeriodStart(date: Date, monthStartDay: number): Date {
	const d = new Date(date);
	if (d.getDate() < monthStartDay) {
		// Go back to previous month's period start
		d.setMonth(d.getMonth() - 1);
	}
	d.setDate(monthStartDay);
	d.setHours(0, 0, 0, 0);
	return d;
}

/**
 * Returns true if dateStr falls in the same calendar-month period as today.
 */
export function isThisMonth(dateStr: string, monthStartDay: number): boolean {
	const date = parseDate(dateStr);
	if (!date) return false;
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const ms = getMonthPeriodStart(date, monthStartDay);
	const mst = getMonthPeriodStart(today, monthStartDay);
	return ms.getTime() === mst.getTime();
}
