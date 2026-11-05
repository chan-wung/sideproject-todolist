import { describe, it, expect } from 'vitest';
import { cx } from './classNames';
import { truncate } from './text';

describe('cx', () => {
  it('거짓 값은 빼고 공백으로 잇는다', () => {
    expect(cx('a', '', false, null, undefined, 'b')).toBe('a b');
  });
  it('아무것도 없으면 빈 문자열', () => {
    expect(cx()).toBe('');
  });
});

describe('truncate', () => {
  it('max 이하면 그대로', () => {
    expect(truncate('abcde', 5)).toBe('abcde');
  });
  it('max를 넘으면 자르고 …을 붙인다', () => {
    expect(truncate('abcdef', 5)).toBe('abcde…');
  });
});
