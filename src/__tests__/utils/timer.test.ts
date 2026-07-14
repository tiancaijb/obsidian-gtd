import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { resetTimer, startTimer, pauseTimer, resumeTimer, stopTimer, getCurrentTimer, getElapsed, formatDuration, formatClockLine, setTickCallback } from '../../utils/timer';

describe('timer', () => {
  beforeEach(() => { resetTimer(); vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });
  it('startTimer creates a running timer', () => { const t = startTimer('/test.md', 0); expect(t.filePath).toBe('/test.md'); expect(t.running).toBe(true); });
  it('getCurrentTimer returns active timer', () => { startTimer('/test.md', 0); expect(getCurrentTimer()).not.toBeNull(); });
  it('pauseTimer stops elapsed from increasing', () => { startTimer('/test.md', 0); vi.advanceTimersByTime(5000); const p = pauseTimer(); expect(p!.running).toBe(false); expect(p!.elapsedMs).toBeGreaterThanOrEqual(5000); });
  it('resumeTimer continues counting', () => { startTimer('/test.md', 0); vi.advanceTimersByTime(3000); pauseTimer(); vi.advanceTimersByTime(5000); resumeTimer(); vi.advanceTimersByTime(2000); expect(getElapsed()).toBeGreaterThanOrEqual(5000); expect(getElapsed()).toBeLessThan(6000); });
  it('stopTimer returns elapsed and clears', () => { startTimer('/test.md', 0); vi.advanceTimersByTime(10000); const r = stopTimer(); expect(r).not.toBeNull(); expect(r!.elapsedMs).toBeGreaterThanOrEqual(10000); expect(getCurrentTimer()).toBeNull(); });
  it('stopTimer null when inactive', () => { expect(stopTimer()).toBeNull(); });
  it('pauseTimer null when inactive', () => { expect(pauseTimer()).toBeNull(); });
  it('resumeTimer null when inactive', () => { expect(resumeTimer()).toBeNull(); });
  it('getElapsed 0 when inactive', () => { expect(getElapsed()).toBe(0); });
  it('tickCallback called on state changes', () => { const cb = vi.fn(); setTickCallback(cb); startTimer('/t', 0); expect(cb).toHaveBeenCalledTimes(1); pauseTimer(); expect(cb).toHaveBeenCalledTimes(2); resumeTimer(); expect(cb).toHaveBeenCalledTimes(3); stopTimer(); expect(cb).toHaveBeenCalledTimes(4); });
});

describe('formatDuration', () => {
  it('<1m', () => { expect(formatDuration(0)).toBe('<1m'); expect(formatDuration(30000)).toBe('<1m'); });
  it('minutes', () => { expect(formatDuration(60000)).toBe('1m'); expect(formatDuration(300000)).toBe('5m'); });
  it('hours', () => { expect(formatDuration(3600000)).toBe('1h'); expect(formatDuration(7200000)).toBe('2h'); });
  it('hours+minutes', () => { expect(formatDuration(5400000)).toBe('1h 30m'); expect(formatDuration(3660000)).toBe('1h 1m'); });
});

describe('formatClockLine', () => {
  const s = new Date(2026, 5, 27, 10, 0); const e = new Date(2026, 5, 27, 10, 25);
  it('standard line', () => { expect(formatClockLine(s, e)).toMatch(/CLOCK:/); expect(formatClockLine(s, e)).toMatch(/=> 0:25/); });
  it('custom keyword', () => { expect(formatClockLine(s, e, '计时')).toMatch(/计时:/); });
  it('multi-hour', () => { expect(formatClockLine(s, new Date(2026, 5, 27, 13, 30))).toMatch(/=> 3:30/); });
});
