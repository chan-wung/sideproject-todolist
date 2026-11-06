import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import {
  writeStorage, readStorage, getStorageStatus, keepThisTabData, resetStorageTracking,
} from './storage';
import { useTodos } from '../hooks/useTodos';
import { useMemos } from '../hooks/useMemos';

const asArray = (raw: unknown) => (Array.isArray(raw) ? raw : null);

// 다른 탭에서 같은 키를 바꾼 것처럼 저장소를 직접 고친다 (같은 창에서는 storage 이벤트가 오지 않으므로 필요하면 따로 보낸다)
function otherTabWrites(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

function storageEvent(key: string | null, newValue: string | null) {
  window.dispatchEvent(new StorageEvent('storage', { key, newValue, storageArea: window.localStorage }));
}

describe('여러 탭 저장 충돌', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStorageTracking();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    localStorage.clear();
    resetStorageTracking();
  });

  it('다른 탭이 먼저 바꾼 키는 덮어쓰지 않고 저장을 멈춘다', async () => {
    writeStorage('k', [1]);
    readStorage('k', asArray, []); // 이 탭이 [1]을 읽음
    otherTabWrites('k', [1, 2]); // 다른 탭이 [1,2]로 저장

    expect(writeStorage('k', [1, 3])).toBe(false);

    expect(JSON.parse(localStorage.getItem('k')!)).toEqual([1, 2]); // 다른 탭의 변경이 남아 있다
    expect(getStorageStatus().staleKeys).toEqual(['k']);
    expect(getStorageStatus().failedKeys).toEqual([]); // 용량 문제로 인한 저장 실패와는 다른 상태
  });

  it('다른 탭이 같은 내용을 저장했다면 충돌이 아니다', () => {
    writeStorage('k', [1]);
    readStorage('k', asArray, []);
    otherTabWrites('k', [1]);
    expect(writeStorage('k', [1, 3])).toBe(true);
    expect(getStorageStatus().staleKeys).toEqual([]);
  });

  it('저장소가 비워졌다면(잃을 데이터가 없으니) 그대로 저장한다', () => {
    writeStorage('k', [1]);
    localStorage.removeItem('k');
    expect(writeStorage('k', [2])).toBe(true);
  });

  it('이 탭이 계속 저장하는 동안에는 자기 저장을 충돌로 보지 않는다', () => {
    readStorage('k', asArray, []);
    expect(writeStorage('k', [1])).toBe(true);
    expect(writeStorage('k', [1, 2])).toBe(true);
    expect(getStorageStatus().staleKeys).toEqual([]);
  });

  it('storage 이벤트로 저장을 시도하기 전에도 바뀐 것을 알린다', async () => {
    writeStorage('k', [1]);
    readStorage('k', asArray, []);
    const before = getStorageStatus();

    storageEvent('k', JSON.stringify([9]));

    expect(getStorageStatus().staleKeys).toEqual(['k']);
    expect(getStorageStatus()).not.toBe(before);
  });

  it('storage 이벤트: 이 탭이 모르는 키와 같은 값은 무시한다', () => {
    writeStorage('k', [1]);
    readStorage('k', asArray, []);
    storageEvent('other-key', '1');
    storageEvent('k', JSON.stringify([1]));
    expect(getStorageStatus().staleKeys).toEqual([]);
  });

  it('이 탭의 내용으로 계속하면 멈춰 둔 최신 값을 저장하고 이후 저장도 다시 된다', () => {
    writeStorage('k', [1]);
    readStorage('k', asArray, []);
    otherTabWrites('k', [1, 2]);
    writeStorage('k', [1, 3]);
    writeStorage('k', [1, 3, 4]); // 멈춰 있는 동안 계속 고쳐도 최신 값만 보관

    keepThisTabData();

    expect(JSON.parse(localStorage.getItem('k')!)).toEqual([1, 3, 4]);
    expect(getStorageStatus().staleKeys).toEqual([]);
    expect(writeStorage('k', [5])).toBe(true);
  });

  it('이벤트만 받은 키도 이 탭의 내용으로 계속하면 해제되어 다음 저장이 통과한다', () => {
    writeStorage('k', [1]);
    readStorage('k', asArray, []);
    otherTabWrites('k', [7]);
    storageEvent('k', JSON.stringify([7]));
    keepThisTabData();
    expect(getStorageStatus().staleKeys).toEqual([]);
    expect(writeStorage('k', [1, 2])).toBe(true);
  });

  describe('앱 데이터', () => {
    it('두 탭이 같은 자정에 반복 회차를 만들어도 저장소에는 한 번만 남는다', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-07-10T23:59:00'));
      const tabA = renderHook(() => useTodos());
      act(() => { tabA.result.current.addTodo('일일 점검', 'medium', '2026-07-10', '', 'daily'); });
      const seriesId = tabA.result.current.recurrenceSeries[0].id;

      // 탭 B가 먼저 자정 회차를 만들어 저장했다
      const stored = JSON.parse(localStorage.getItem('todolist-items')!);
      otherTabWrites('todolist-items', [
        { ...stored[0], id: 'from-tab-b', dueDate: '2026-07-11', seriesId },
        ...stored,
      ]);

      act(() => { vi.advanceTimersByTime(2 * 60 * 1000); }); // 탭 A도 자정을 맞는다

      const saved = JSON.parse(localStorage.getItem('todolist-items')!);
      expect(saved.filter((t: { dueDate: string }) => t.dueDate === '2026-07-11')).toHaveLength(1);
      expect(saved.some((t: { id: string }) => t.id === 'from-tab-b')).toBe(true);
      expect(getStorageStatus().staleKeys).toContain('todolist-items');
    });

    it('저장이 멈춘 동안 쓴 메모는 화면에 남고, 이 탭의 내용으로 계속하면 저장된다', () => {
      localStorage.setItem('todolist-memos-array', JSON.stringify([{ id: 'm1', title: '제목', content: '원본' }]));
      const { result } = renderHook(() => useMemos());
      otherTabWrites('todolist-memos-array', [{ id: 'm1', title: '제목', content: '다른 탭에서 고침' }]);

      act(() => { result.current.setMemos([{ id: 'm1', title: '제목', content: '이 탭에서 쓰던 글' }]); });

      expect(result.current.memos[0].content).toBe('이 탭에서 쓰던 글'); // 화면(메모리)은 그대로
      expect(JSON.parse(localStorage.getItem('todolist-memos-array')!)[0].content).toBe('다른 탭에서 고침');

      act(() => { keepThisTabData(); });
      expect(JSON.parse(localStorage.getItem('todolist-memos-array')!)[0].content).toBe('이 탭에서 쓰던 글');
    });
  });
});
