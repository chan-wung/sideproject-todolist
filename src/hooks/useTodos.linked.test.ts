import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useTodos } from './useTodos';
import { resetStorageTracking } from '../utils/storage';
import { TODOS_KEY, SERIES_KEY } from '../constants/storageKeys';

describe('반복 회차 생성과 저장 순서 (R03)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-11-06T09:00:00'));
    localStorage.clear();
    resetStorageTracking();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    localStorage.clear();
    resetStorageTracking();
  });

  it('회차 생성 때 할 일 저장이 실패하면 생성 기록(커서)을 앞으로 저장하지 않아 재로드 후에도 회차가 만들어진다', () => {
    const series = [{ id: 's1', text: '일일 점검', frequency: 'daily', anchorDate: '2026-11-04', status: 'active', lastMaterializedDate: '2026-11-04', createdAt: '2026-11-01T00:00:00.000Z' }];
    localStorage.setItem(SERIES_KEY, JSON.stringify(series));
    const before = localStorage.getItem(SERIES_KEY);

    const realSet = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) {
      if (k === TODOS_KEY) throw new DOMException('full', 'QuotaExceededError');
      return realSet.call(this, k, v);
    });

    const { result } = renderHook(() => useTodos());
    act(() => { window.dispatchEvent(new Event('focus')); });

    expect(result.current.allTodos.some(t => t.seriesId === 's1')).toBe(true); // 화면에는 회차가 생겼지만
    expect(localStorage.getItem(SERIES_KEY)).toBe(before); // 저장된 생성 기록은 그대로라 다시 열면 재생성된다
  });
});
