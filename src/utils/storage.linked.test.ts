import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  writeStorage, readStorage, getStorageStatus, keepThisTabData, retryFailedWrites,
  unsavedKeysAmong, resetStorageTracking,
} from './storage';
import { TODOS_KEY, SERIES_KEY } from '../constants/storageKeys';

const asArray = (raw: unknown) => (Array.isArray(raw) ? raw : null);
const stored = (key: string) => JSON.parse(localStorage.getItem(key) ?? 'null');
const storageEvent = (key: string, newValue: string | null) =>
  window.dispatchEvent(new StorageEvent('storage', { key, newValue, storageArea: window.localStorage }));

describe('연결된 저장 키와 저장 결과 판정 (R03·R04·R05)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.clear();
    resetStorageTracking();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    resetStorageTracking();
  });

  it('R03: 할 일 저장이 다른 탭 충돌로 막히면 반복 일정 기록도 저장하지 않는다', () => {
    localStorage.setItem(TODOS_KEY, JSON.stringify([{ id: 'a' }]));
    localStorage.setItem(SERIES_KEY, JSON.stringify([{ id: 's', cursor: 'old' }]));
    readStorage(TODOS_KEY, asArray, []);
    readStorage(SERIES_KEY, asArray, []);
    localStorage.setItem(TODOS_KEY, JSON.stringify([{ id: 'a' }, { id: 'from-other-tab' }])); // 다른 탭이 할 일만 변경

    expect(writeStorage(TODOS_KEY, [{ id: 'a' }, { id: 'new-occurrence' }])).toBe(false);
    expect(writeStorage(SERIES_KEY, [{ id: 's', cursor: 'new' }])).toBe(false);

    expect(stored(SERIES_KEY)).toEqual([{ id: 's', cursor: 'old' }]); // 생성 기록(커서)이 앞서가지 않는다
  });

  it('R03: 할 일 저장이 용량 부족으로 실패하면 반복 일정 기록은 기다렸다가 함께 재시도로 저장된다', () => {
    const realSet = Storage.prototype.setItem;
    let full = true;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, k: string, v: string) {
      if (full && k === TODOS_KEY) throw new DOMException('full', 'QuotaExceededError');
      return realSet.call(this, k, v);
    });

    expect(writeStorage(TODOS_KEY, [{ id: 'new' }])).toBe(false);
    expect(writeStorage(SERIES_KEY, [{ id: 's', cursor: 'new' }])).toBe(false);
    expect(localStorage.getItem(SERIES_KEY)).toBeNull();

    full = false;
    expect(retryFailedWrites()).toEqual([]);
    expect(stored(TODOS_KEY)).toEqual([{ id: 'new' }]);
    expect(stored(SERIES_KEY)).toEqual([{ id: 's', cursor: 'new' }]);
  });

  it('R03: 이 탭 내용으로 계속하면 할 일과 반복 일정 기록이 함께 저장된다', () => {
    readStorage(TODOS_KEY, asArray, []);
    readStorage(SERIES_KEY, asArray, []);
    localStorage.setItem(TODOS_KEY, JSON.stringify([{ id: 'other' }]));
    writeStorage(TODOS_KEY, [{ id: 'mine' }]);
    writeStorage(SERIES_KEY, [{ id: 's' }]);

    keepThisTabData();

    expect(stored(TODOS_KEY)).toEqual([{ id: 'mine' }]);
    expect(stored(SERIES_KEY)).toEqual([{ id: 's' }]);
    expect(getStorageStatus().staleKeys).toEqual([]);
  });

  it('R04: 다른 탭 충돌로 저장이 멈춘 구역은 저장되지 않은 것으로 판정하고, 다른 구역은 세지 않는다', () => {
    readStorage('a', asArray, []);
    readStorage('b', asArray, []);
    localStorage.setItem('a', JSON.stringify([9]));
    writeStorage('a', [1]);
    writeStorage('b', [2]);

    expect(unsavedKeysAmong(['a'])).toEqual(['a']);
    expect(unsavedKeysAmong(['b'])).toEqual([]);
  });

  it('R04: 저장 실패한 키도 판정에 잡히고, 저장에 성공하면 풀린다', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });
    writeStorage('a', [1]);
    expect(unsavedKeysAmong(['a', 'b'])).toEqual(['a']);
    spy.mockRestore();
    retryFailedWrites();
    expect(unsavedKeysAmong(['a'])).toEqual([]);
  });

  it('R05: 다른 탭 이벤트만 받고 편집이 없어도 이 탭 내용으로 계속하면 재로드 후에도 이 탭 내용이 남는다', () => {
    writeStorage('k', [1]);
    readStorage('k', asArray, []); // 이 탭이 [1]을 읽음
    localStorage.setItem('k', JSON.stringify([7])); // 다른 탭이 [7] 저장
    storageEvent('k', JSON.stringify([7]));
    expect(getStorageStatus().staleKeys).toEqual(['k']);

    keepThisTabData(); // 추가 편집 없이 선택

    expect(stored('k')).toEqual([1]);
    expect(getStorageStatus().staleKeys).toEqual([]);
  });
});
