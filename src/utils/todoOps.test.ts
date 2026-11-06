import { describe, it, expect } from 'vitest';
import { withValidMemoLinks } from './todoOps';
import type { Todo } from '../types/todo';

const todo = (memoIds?: string[]): Todo => ({ id: 't', text: '업무', completed: false, priority: 'medium', category: '기본', createdAt: '2026-11-01T09:00:00', memoIds });

describe('withValidMemoLinks', () => {
  it('유효한 메모만 남긴다', () => {
    expect(withValidMemoLinks(todo(['a', 'b']), new Set(['b'])).memoIds).toEqual(['b']);
  });

  it('모두 없어지면 memoIds를 지운다', () => {
    expect(withValidMemoLinks(todo(['a']), new Set()).memoIds).toBeUndefined();
  });

  it('바꿀 게 없으면 같은 객체를 돌려준다', () => {
    const t = todo(['a']);
    expect(withValidMemoLinks(t, new Set(['a']))).toBe(t);
    expect(withValidMemoLinks(todo(), new Set())).toEqual(todo());
  });

  it('유효 목록을 아직 모르면(null) 그대로 둔다', () => {
    const t = todo(['a']);
    expect(withValidMemoLinks(t, null)).toBe(t);
  });
});
