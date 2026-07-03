import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isToday, isOverdue, isThisWeek, formatDate, calculateNextRecurrence } from './date';

describe('date utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-02T10:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('isToday', () => {
    expect(isToday('2026-07-02')).toBe(true);
    expect(isToday('2026-07-01')).toBe(false);
    expect(isToday('2026-07-03')).toBe(false);
    expect(isToday(undefined)).toBe(false);
  });

  it('isOverdue', () => {
    expect(isOverdue('2026-07-01')).toBe(true);
    expect(isOverdue('2026-07-02')).toBe(false);
    expect(isOverdue(undefined)).toBe(false);
  });

  it('isThisWeek', () => {
    expect(isThisWeek('2026-07-02')).toBe(true);
    expect(isThisWeek('2026-07-09')).toBe(true); // +7 days
    expect(isThisWeek('2026-07-10')).toBe(false); // +8 days
    expect(isThisWeek('2026-07-01')).toBe(false); // yesterday
  });

  it('formatDate', () => {
    expect(formatDate('2026-07-02')).toBe('2026.07.02');
    expect(formatDate('2026-07-02T10:00:00.000Z')).toBe('2026.07.02');
  });

  it('calculateNextRecurrence', () => {
    expect(calculateNextRecurrence('2026-07-02', 'daily')).toBe('2026-07-03');
    expect(calculateNextRecurrence('2026-07-02', 'weekly')).toBe('2026-07-09');
    expect(calculateNextRecurrence('2026-07-02', 'monthly')).toBe('2026-08-02');
    expect(calculateNextRecurrence('2026-07-02', 'none')).toBe(undefined);
    expect(calculateNextRecurrence('2026-07-02', undefined)).toBe(undefined);
    expect(calculateNextRecurrence(undefined, 'daily')).toBe('2026-07-03');
    
    // 월말 경계 테스트
    expect(calculateNextRecurrence('2026-01-31', 'monthly')).toBe('2026-03-03'); // JS Date behavior for Jan 31 + 1 month = Feb 31 -> Mar 3
  });
});
