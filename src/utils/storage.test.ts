import { describe, it, expect, beforeEach } from 'vitest';
import { readStorage, writeStorage } from './storage';

const asNumbers = (raw: unknown) => (Array.isArray(raw) && raw.every(n => typeof n === 'number') ? (raw as number[]) : null);

describe('readStorage', () => {
  beforeEach(() => localStorage.clear());

  it('저장된 값을 검증해서 돌려준다', () => {
    writeStorage('k', [1, 2]);
    expect(readStorage('k', asNumbers, [])).toEqual([1, 2]);
  });

  it('값이 없으면 fallback', () => {
    expect(readStorage('none', asNumbers, [9])).toEqual([9]);
  });

  it('JSON이 깨졌으면 fallback', () => {
    localStorage.setItem('k', '{broken');
    expect(readStorage('k', asNumbers, [])).toEqual([]);
  });

  it('검증에 실패(null)하면 fallback', () => {
    writeStorage('k', ['a']);
    expect(readStorage('k', asNumbers, [7])).toEqual([7]);
  });
});
