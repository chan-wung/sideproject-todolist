import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useBackupReminder } from './useBackupReminder';

const LAST_KEY = 'todolist-last-backup';
const SNOOZE_KEY = 'todolist-backup-snooze';

describe('useBackupReminder', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-04T10:00:00'));
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('지킬 데이터가 없으면 알리지 않는다', () => {
    const { result } = renderHook(() => useBackupReminder(false));
    expect(result.current.reminder.show).toBe(false);
    expect(result.current.lastBackup).toBeNull();
  });

  it('한 번도 백업하지 않았고 데이터가 있으면 알린다', () => {
    const { result } = renderHook(() => useBackupReminder(true));
    expect(result.current.reminder.show).toBe(true);
    expect(result.current.reminder.message).toContain('백업한 적이 없습니다');
  });

  it('내보내면 오늘 날짜를 기억하고 알림이 사라진다 (새로 열어도 유지)', () => {
    const { result } = renderHook(() => useBackupReminder(true));
    act(() => result.current.markBackedUp());
    expect(result.current.lastBackup).toBe('2026-11-04');
    expect(result.current.reminder.show).toBe(false);
    expect(JSON.parse(localStorage.getItem(LAST_KEY) as string)).toBe('2026-11-04');

    cleanup();
    const reopened = renderHook(() => useBackupReminder(true));
    expect(reopened.result.current.lastBackup).toBe('2026-11-04');
    expect(reopened.result.current.reminder.show).toBe(false);
  });

  it('저장된 마지막 백업이 8일 전이면 며칠 전인지 알린다', () => {
    localStorage.setItem(LAST_KEY, JSON.stringify('2026-10-27'));
    const { result } = renderHook(() => useBackupReminder(true));
    expect(result.current.reminder.show).toBe(true);
    expect(result.current.reminder.message).toContain('8일 전');
  });

  it('마지막 백업이 6일 전이면 알리지 않는다', () => {
    localStorage.setItem(LAST_KEY, JSON.stringify('2026-10-29'));
    const { result } = renderHook(() => useBackupReminder(true));
    expect(result.current.reminder.show).toBe(false);
  });

  it('내일 다시 알림: 오늘은 숨기고, 날짜가 바뀌면 다시 알린다', () => {
    const { result } = renderHook(() => useBackupReminder(true));
    act(() => result.current.snooze());
    expect(result.current.reminder.show).toBe(false);
    expect(JSON.parse(localStorage.getItem(SNOOZE_KEY) as string)).toBe('2026-11-04');

    // 다음 날로 넘어간 뒤 탭이 다시 보이게 되면 날짜를 새로 읽는다
    vi.setSystemTime(new Date('2026-11-05T09:00:00'));
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(result.current.reminder.show).toBe(true);
  });
});
