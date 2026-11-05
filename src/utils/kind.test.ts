import { describe, it, expect } from 'vitest';
import { isTodoKind, normalizeKind } from './kind';

describe('normalizeKind', () => {
  it('알려진 종류는 그대로 둔다', () => {
    expect(normalizeKind('task')).toBe('task');
    expect(normalizeKind('routine')).toBe('routine');
    expect(normalizeKind('leave')).toBe('leave');
  });

  it('없거나 알 수 없는 값은 일반 업무로 본다', () => {
    expect(normalizeKind(undefined)).toBe('task');
    expect(normalizeKind(null)).toBe('task');
    expect(normalizeKind('')).toBe('task');
    expect(normalizeKind('vacation')).toBe('task');
    expect(normalizeKind(1)).toBe('task');
  });
});

describe('isTodoKind', () => {
  it('문자열이 아니거나 목록에 없으면 false', () => {
    expect(isTodoKind('routine')).toBe(true);
    expect(isTodoKind('Routine')).toBe(false);
    expect(isTodoKind(undefined)).toBe(false);
  });
});
