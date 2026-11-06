import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  writeStorage, readStorage, getStorageStatus, readCorruptBackups, discardCorruptBackups,
  resetStorageTracking, CORRUPT_BACKUP_PREFIX,
} from './storage';

const reject = () => null; // 항상 검증 실패 = 손상

describe('읽을 수 없는 원문 보호 (R01)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    localStorage.clear();
    resetStorageTracking();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    discardCorruptBackups();
    localStorage.clear();
    resetStorageTracking();
  });

  it('보관에 실패하면 원본을 기본값으로 덮어쓰지 않고, 원문은 메모리에서 내려받을 수 있다', () => {
    localStorage.setItem('k', '{broken');
    const realSet = Storage.prototype.setItem;
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(function (this: Storage, key: string, value: string) {
      if (key.startsWith(CORRUPT_BACKUP_PREFIX)) throw new DOMException('full', 'QuotaExceededError');
      return realSet.call(this, key, value);
    });

    expect(readStorage('k', reject, [])).toEqual([]);
    expect(writeStorage('k', [])).toBe(false); // 자동 저장이 막혀야 한다
    expect(localStorage.getItem('k')).toBe('{broken');
    expect(getStorageStatus().heldKeys).toEqual(['k']);
    expect(readCorruptBackups()).toEqual({ k: '{broken' });
  });

  it('이미 다른 원문이 보관돼 있으면 새 손상 원문을 버리지 않고 둘 다 내려받게 한다', () => {
    localStorage.setItem(CORRUPT_BACKUP_PREFIX + 'k', 'old-raw');
    localStorage.setItem('k', 'new-raw');
    readStorage('k', reject, []);
    expect(writeStorage('k', [])).toBe(false);
    expect(localStorage.getItem('k')).toBe('new-raw');
    expect(readCorruptBackups()).toEqual({ k: 'old-raw', 'k (최근 원문)': 'new-raw' });
  });

  it('같은 원문이 이미 보관돼 있으면 저장을 막지 않는다', () => {
    localStorage.setItem(CORRUPT_BACKUP_PREFIX + 'k', 'same');
    localStorage.setItem('k', 'same');
    readStorage('k', reject, []);
    expect(getStorageStatus().heldKeys).toEqual([]);
    expect(writeStorage('k', [])).toBe(true);
  });

  it('읽기 자체가 실패(SecurityError)하면 그 키를 덮어쓰지 않는다', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new DOMException('denied', 'SecurityError'); });
    expect(readStorage('k', reject, [])).toEqual([]);
    expect(writeStorage('k', ['x'])).toBe(false);
    expect(getStorageStatus().heldKeys).toEqual(['k']);
  });

  it('명시적으로 보관본을 지우면 저장이 다시 시작되고 쌓인 최신 값이 저장된다', () => {
    localStorage.setItem(CORRUPT_BACKUP_PREFIX + 'k', 'old-raw');
    localStorage.setItem('k', 'new-raw');
    readStorage('k', reject, []);
    writeStorage('k', ['latest']);

    discardCorruptBackups();

    expect(getStorageStatus().heldKeys).toEqual([]);
    expect(localStorage.getItem('k')).toBe(JSON.stringify(['latest']));
    expect(writeStorage('k', ['next'])).toBe(true);
  });
});
