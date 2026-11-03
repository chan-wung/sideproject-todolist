import { describe, it, expect } from 'vitest';
import { moveItem } from './list';

describe('moveItem', () => {
  it('앞에서 뒤로 옮긴다', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('뒤에서 앞으로 옮긴다', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('원본 배열은 바꾸지 않는다', () => {
    const src = ['a', 'b', 'c'];
    moveItem(src, 0, 2);
    expect(src).toEqual(['a', 'b', 'c']);
  });

  it('같은 위치면 원본 배열 그대로 반환한다', () => {
    const src = ['a', 'b'];
    expect(moveItem(src, 1, 1)).toBe(src);
  });

  it('범위를 벗어난 index(-1 포함)면 원본 배열 그대로 반환한다', () => {
    const src = ['a', 'b', 'c'];
    expect(moveItem(src, -1, 1)).toBe(src);
    expect(moveItem(src, 0, -1)).toBe(src);
    expect(moveItem(src, 3, 0)).toBe(src);
    expect(moveItem(src, 0, 3)).toBe(src);
  });
});
