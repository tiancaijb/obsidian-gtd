import { describe, it, expect } from 'vitest';
import { parseClockLine, extractClockRecords, filterByDate, totalMinutes, formatDuration } from '../../utils/clock-parser';

describe('parseClockLine', () => {
  it('parses standard CLOCK line', () => {
    const r = parseClockLine('  CLOCK: [2026-06-27 Sat 10:00]--[2026-06-27 Sat 10:25] => 0:25');
    expect(r).not.toBeNull();
    expect(r!.durationMin).toBe(25);
  });
  it('parses Chinese 计时 keyword', () => {
    const r = parseClockLine('  计时: [2026-06-27 Sat 10:00]--[2026-06-27 Sat 10:30] => 0:30');
    expect(r).not.toBeNull();
    expect(r!.durationMin).toBe(30);
  });
  it('parses multi-hour duration', () => { const r = parseClockLine('  CLOCK: [2026-06-27 Sat 09:00]--[2026-06-27 Sat 11:30] => 2:30'); expect(r).not.toBeNull(); expect(r!.durationMin).toBe(150); });
  it('returns null for invalid format', () => { expect(parseClockLine('')).toBeNull(); expect(parseClockLine('not a clock line')).toBeNull(); });
  it('returns null for malformed date', () => { expect(parseClockLine('  CLOCK: [not-a-date]--[2026-06-27 Sat 10:00] => 0:30')).toBeNull(); });
  it('parses cross-midnight record', () => { const r = parseClockLine('  CLOCK: [2026-06-27 Sat 23:00]--[2026-06-28 Sun 01:30] => 2:30'); expect(r).not.toBeNull(); expect(r!.durationMin).toBe(150); });
  it('parses zero-duration record', () => { const r = parseClockLine('  CLOCK: [2026-06-27 Sat 10:00]--[2026-06-27 Sat 10:00] => 0:00'); expect(r).not.toBeNull(); expect(r!.durationMin).toBe(0); });
});

describe('extractClockRecords', () => {
  it('extracts all CLOCK lines', () => { expect(extractClockRecords(['  CLOCK: [2026-06-27 Sat 10:00]--[2026-06-27 Sat 10:25] => 0:25', '  CLOCK: [2026-06-27 Sat 11:00]--[2026-06-27 Sat 11:30] => 0:30'])).toHaveLength(2); });
  it('returns empty array for no CLOCK lines', () => { expect(extractClockRecords(['a', 'b'])).toHaveLength(0); });
  it('returns empty array for empty input', () => { expect(extractClockRecords([])).toHaveLength(0); });
});

describe('filterByDate', () => {
  const records = [parseClockLine('  CLOCK: [2026-06-27 Sat 10:00]--[2026-06-27 Sat 10:25] => 0:25')!, parseClockLine('  CLOCK: [2026-06-28 Sun 11:00]--[2026-06-28 Sun 11:30] => 0:30')!];
  it('filters by exact date', () => { expect(filterByDate(records, '2026-06-27')).toHaveLength(1); });
  it('returns empty for date with no records', () => { expect(filterByDate(records, '2026-06-29')).toHaveLength(0); });
});

describe('totalMinutes', () => {
  it('sums durations', () => { expect(totalMinutes([parseClockLine('  CLOCK: [2026-06-27 Sat 10:00]--[2026-06-27 Sat 10:25] => 0:25')!, parseClockLine('  CLOCK: [2026-06-28 Sun 11:00]--[2026-06-28 Sun 12:30] => 1:30')!])).toBe(115); });
  it('returns 0 for empty array', () => { expect(totalMinutes([])).toBe(0); });
});

describe('formatDuration', () => {
  it('<1m', () => { expect(formatDuration(0)).toBe('<1m'); });
  it('1m', () => { expect(formatDuration(1)).toBe('1m'); });
  it('5m', () => { expect(formatDuration(5)).toBe('5m'); });
  it('59m', () => { expect(formatDuration(59)).toBe('59m'); });
  it('1h', () => { expect(formatDuration(60)).toBe('1h'); });
  it('1h 1m', () => { expect(formatDuration(61)).toBe('1h 1m'); });
  it('1h 30m', () => { expect(formatDuration(90)).toBe('1h 30m'); });
  it('2h 30m', () => { expect(formatDuration(150)).toBe('2h 30m'); });
  it('10h', () => { expect(formatDuration(600)).toBe('10h'); });
});
