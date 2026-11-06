import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  writeStorage, readStorage, retryFailedWrites, getStorageStatus,
  readCorruptBackups, discardCorruptBackups, subscribeStorageStatus, CORRUPT_BACKUP_PREFIX,
} from './storage';

const noop = () => null;

describe('저장 상태', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.clear();
    retryFailedWrites();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    discardCorruptBackups();
    localStorage.clear();
  });

  it('저장이 실패하면 키를 실패 목록에 올리고 false를 돌려준다', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError'); });
    expect(writeStorage('k', [1])).toBe(false);
    expect(getStorageStatus().failedKeys).toContain('k');
  });

  it('같은 키가 계속 실패해도 상태 객체는 바뀌지 않아 알림이 반복되지 않는다', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });
    writeStorage('k', 1);
    const first = getStorageStatus();
    writeStorage('k', 2);
    expect(getStorageStatus()).toBe(first);
  });

  it('재시도하면 가장 최근에 저장하지 못한 값이 저장되고 실패 표시가 풀린다', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });
    writeStorage('k', 'old');
    writeStorage('k', 'latest');
    spy.mockRestore();

    expect(retryFailedWrites()).toEqual([]);
    expect(localStorage.getItem('k')).toBe('"latest"');
    expect(getStorageStatus().failedKeys).not.toContain('k');
  });

  it('재시도도 실패하면 실패 목록에 그대로 남는다', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });
    writeStorage('k', 1);
    expect(retryFailedWrites()).toContain('k');
  });

  it('그냥 다시 저장에 성공해도 실패 표시가 풀린다', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });
    writeStorage('k', 1);
    spy.mockRestore();
    expect(writeStorage('k', 2)).toBe(true);
    expect(getStorageStatus().failedKeys).not.toContain('k');
  });

  it('손상 원문은 보관되고 목록·내려받기용 객체로 읽히며, 지우면 사라진다', () => {
    localStorage.setItem('k', '{깨진');
    readStorage('k', noop, null);
    expect(getStorageStatus().corruptKeys).toContain('k');
    expect(readCorruptBackups()).toEqual({ k: '{깨진' });

    discardCorruptBackups();
    expect(getStorageStatus().corruptKeys).toEqual([]);
    expect(localStorage.getItem(CORRUPT_BACKUP_PREFIX + 'k')).toBeNull();
  });

  it('상태가 바뀌면 구독자에게 알린다', async () => {
    const listener = vi.fn();
    const off = subscribeStorageStatus(listener);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('full'); });
    writeStorage('n', 1);
    await Promise.resolve();
    expect(listener).toHaveBeenCalled();
    off();
  });
});
