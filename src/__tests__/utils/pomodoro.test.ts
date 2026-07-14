import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { resetPomodoro, startPomodoro, pausePomodoro, resumePomodoro, stopPomodoro, getPomodoroState, setPomodoroConfig, setPomodoroTimeProvider, setPomodoroCallbacks, formatPomodoroTime, setRegisterIntervalFn } from '../../utils/pomodoro';

describe('pomodoro', () => {
  beforeEach(() => {
    vi.stubGlobal('window', globalThis);
    resetPomodoro();
    vi.useFakeTimers();
  });
  afterEach(() => { vi.useRealTimers(); });

  it('initial state is idle', () => { const s = getPomodoroState(); expect(s.phase).toBe('idle'); });

  it('startPomodoro enters focus', () => {
    startPomodoro('/test.md', 0);
    const s = getPomodoroState();
    expect(s.phase).toBe('focus');
    expect(s.taskFilePath).toBe('/test.md');
    expect(s.taskLine).toBe(0);
    expect(s.secondsRemaining).toBe(25 * 60);
  });

  it('pausePomodoro pauses countdown', () => {
    startPomodoro();
    vi.advanceTimersByTime(5000);
    pausePomodoro();
    const s1 = getPomodoroState();
    expect(s1.paused).toBe(true);
    vi.advanceTimersByTime(10000);
    const s2 = getPomodoroState();
    expect(s2.secondsRemaining).toBe(s1.secondsRemaining);
  });

  it('resumePomodoro continues countdown', () => {
    startPomodoro();
    vi.advanceTimersByTime(5000);
    pausePomodoro();
    const paused = getPomodoroState().secondsRemaining;
    resumePomodoro();
    vi.advanceTimersByTime(3000);
    expect(getPomodoroState().secondsRemaining).toBe(paused - 3);
  });

  it('stopPomodoro returns to idle', () => {
    startPomodoro();
    stopPomodoro();
    expect(getPomodoroState().phase).toBe('idle');
  });

  it('stopPomodoro returns elapsed info', () => {
    startPomodoro();
    vi.advanceTimersByTime(10000);
    const r = stopPomodoro();
    expect(r).not.toBeNull();
    expect(r!.phase).toBe('focus');
    expect(r!.elapsedSec).toBe(10);
  });

  it('stopPomodoro null when idle', () => { expect(stopPomodoro()).toBeNull(); });

  it('transitions focus→shortBreak', () => {
    setPomodoroConfig({ focusMinutes: 0.05, shortBreakMinutes: 0.05, longBreakAfter: 10 });
    startPomodoro();
    vi.advanceTimersByTime(4000);
    expect(getPomodoroState().phase).toBe('shortBreak');
  });

  it('tickCallback called during countdown', () => {
    const cb = vi.fn();
    setPomodoroCallbacks(cb, null);
    startPomodoro();
    vi.advanceTimersByTime(3000);
    expect(cb).toHaveBeenCalled();
  });

  it('formatPomodoroTime formats correctly', () => {
    expect(formatPomodoroTime(0)).toBe('00:00');
    expect(formatPomodoroTime(65)).toBe('01:05');
    expect(formatPomodoroTime(3661)).toBe('61:01');
  });

  it('setRegisterIntervalFn registers interval', () => {
    const fn = vi.fn();
    setRegisterIntervalFn(fn);
    startPomodoro();
    expect(fn).toHaveBeenCalled();
  });
});
