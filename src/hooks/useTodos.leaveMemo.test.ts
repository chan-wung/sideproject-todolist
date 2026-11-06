import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useTodos } from './useTodos';

describe('연차·휴가의 메모 연결 (T07 경계)', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => { cleanup(); localStorage.clear(); });

  it('연차에는 메모를 연결하지 않고, 일반 할 일에는 연결한다', () => {
    const { result } = renderHook(() => useTodos());
    act(() => { result.current.addTodo('연차 휴가', 'medium', '2099-01-02', '', 'none', 'leave'); });
    act(() => { result.current.addTodo('일반 업무', 'medium', '', ''); });
    const find = (text: string) => result.current.allTodos.find(t => t.text.includes(text))!;

    act(() => { result.current.linkMemoToTodo(find('연차').id, 'm1'); });
    act(() => { result.current.linkMemoToTodo(find('일반').id, 'm1'); });

    expect(find('연차').memoIds).toBeUndefined();
    expect(find('일반').memoIds).toEqual(['m1']);
  });
});
