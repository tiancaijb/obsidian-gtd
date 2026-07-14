import { describe, it, expect } from 'vitest';
import { formatDate, parseDate, todayStr, computeNextDate, compareDates, isToday, getWeekStart, isThisWeek, getMonthPeriodStart } from '../../utils/date-utils';

describe('formatDate', () => {
  it('formats to YYYY-MM-DD', () => { expect(formatDate(new Date(2026, 5, 27))).toBe('2026-06-27'); });
  it('pads single digits', () => { expect(formatDate(new Date(2026, 0, 5))).toBe('2026-01-05'); });
});

describe('parseDate', () => {
  it('parses valid date', () => { const d = parseDate('2026-06-27'); expect(d).not.toBeNull(); expect(d!.getDate()).toBe(27); });
  it('returns null for invalid', () => { expect(parseDate('not-a-date')).toBeNull(); expect(parseDate('')).toBeNull(); });
  it('returns null for impossible date', () => { expect(parseDate('2026-13-01')).toBeNull(); });
});

describe('todayStr', () => { it('returns YYYY-MM-DD', () => { expect(todayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/); }); });

describe('computeNextDate', () => {
  it('+1d', () => { expect(computeNextDate('2026-06-27', '+1d')).toBe('2026-06-28'); });
  it('+2w', () => { expect(computeNextDate('2026-06-27', '+2w')).toBe('2026-07-11'); });
  it('+1m', () => { expect(computeNextDate('2026-06-27', '+1m')).toBe('2026-07-27'); });
  it('month boundary Jan 31 +1m', () => { expect(computeNextDate('2026-01-31', '+1m')).toBe('2026-02-28'); });
  it('year rollover', () => { expect(computeNextDate('2026-12-01', '+1m')).toBe('2027-01-01'); });
  it('returns null for invalid', () => { expect(computeNextDate('2026-06-27', 'invalid')).toBeNull(); });
  it('+7d cross year', () => { expect(computeNextDate('2026-12-31', '+7d')).toBe('2027-01-07'); });
});

describe('compareDates', () => {
  it('a < b', () => { expect(compareDates('2026-06-27', '2026-06-28')).toBeLessThan(0); });
  it('a > b', () => { expect(compareDates('2026-06-28', '2026-06-27')).toBeGreaterThan(0); });
  it('equal', () => { expect(compareDates('2026-06-27', '2026-06-27')).toBe(0); });
});

describe('isToday', () => { it('today', () => { expect(isToday(todayStr())).toBe(true); }); it('yesterday', () => { const d = new Date(); d.setDate(d.getDate() - 1); expect(isToday(formatDate(d))).toBe(false); }); });

describe('getWeekStart', () => {
  it('Monday start (weekStartDay=1)', () => { expect(formatDate(getWeekStart(new Date(2026, 5, 27), 1))).toBe('2026-06-22'); });
  it('Sunday start (weekStartDay=7)', () => { expect(formatDate(getWeekStart(new Date(2026, 5, 27), 7))).toBe('2026-06-21'); });
});

describe('isThisWeek', () => {
  it('today', () => { expect(isThisWeek(todayStr(), 1)).toBe(true); });
  it('far past', () => { expect(isThisWeek('2025-01-01', 1)).toBe(false); });
});

describe('getMonthPeriodStart', () => {
  it('date >= startDay', () => { expect(formatDate(getMonthPeriodStart(new Date(2026, 5, 15), 1))).toBe('2026-06-01'); });
  it('date < startDay', () => { expect(formatDate(getMonthPeriodStart(new Date(2026, 5, 5), 10))).toBe('2026-05-10'); });
});
