import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useMemos } from './useMemos';
import { useTodos } from './useTodos';

const LEGACY = 'todolist-memo-content';
const MEMOS = 'todolist-memos-array';

describe('useMemos', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  describe('옛 단일 메모 이행', () => {
    it('새 키가 없을 때 한 번만 기본 메모로 옮기고 옛 키를 지운다', () => {
      localStorage.setItem(LEGACY, JSON.stringify('옛 메모 내용'));
      const { result } = renderHook(() => useMemos());

      expect(result.current.memos).toHaveLength(1);
      expect(result.current.memos[0]).toMatchObject({ title: '기본 메모', content: '옛 메모 내용' });
      expect(JSON.parse(localStorage.getItem(MEMOS)!)).toHaveLength(1);
      expect(localStorage.getItem(LEGACY)).toBeNull();
    });

    it('메모를 비운 뒤(빈 배열 저장)에는 옛 내용이 되살아나지 않는다', () => {
      localStorage.setItem(MEMOS, '[]');
      localStorage.setItem(LEGACY, JSON.stringify('옛 메모 내용'));
      const { result } = renderHook(() => useMemos());
      expect(result.current.memos).toEqual([]);
    });

    it('초기화하면 옛 키도 지워 다시 시작해도 부활하지 않는다', () => {
      localStorage.setItem(LEGACY, JSON.stringify('옛 메모 내용'));
      const first = renderHook(() => useMemos());
      act(() => { first.result.current.resetMemos(); });
      first.unmount();

      localStorage.setItem(LEGACY, JSON.stringify('다시 생긴 옛 내용')); // 설령 옛 키가 남아 있어도
      const second = renderHook(() => useMemos());
      expect(second.result.current.memos).toEqual([]); // 새 키가 이미 있으므로 이행하지 않는다
    });

    it('옛 내용이 없으면 이행하지 않고 빈 목록으로 시작한다', () => {
      const { result } = renderHook(() => useMemos());
      expect(result.current.memos).toEqual([]);
    });
  });

  it('고른 메모가 없거나 사라졌으면 첫 메모를 고른다 (메모장을 열지 않아도)', () => {
    localStorage.setItem(MEMOS, JSON.stringify([{ id: 'm1', title: 'a', content: '' }, { id: 'm2', title: 'b', content: '' }]));
    localStorage.setItem('todolist-active-memo', JSON.stringify('deleted'));
    const { result } = renderHook(() => useMemos());
    expect(result.current.activeId).toBe('m1');

    act(() => { result.current.setActiveId('m2'); });
    act(() => { result.current.setMemos([{ id: 'm1', title: 'a', content: '' }]); });
    expect(result.current.activeId).toBe('m1');
  });
});

describe('메모 연결 정리 (pruneMemoLinks)', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('메모를 모두 지워 목록이 비어도 할 일의 연결이 지워진다', () => {
    const { result } = renderHook(() => useTodos());
    act(() => { result.current.addTodo('업무', 'medium', '', ''); });
    const id = result.current.allTodos[0].id;
    act(() => { result.current.linkMemoToTodo(id, 'm1'); });

    act(() => { result.current.pruneMemoLinks([]); });

    expect(result.current.allTodos[0].memoIds).toBeUndefined();
  });

  it('반복 시리즈의 메모 연결도 지워서 새 회차가 지워진 메모를 이어받지 않는다', () => {
    const { result } = renderHook(() => useTodos());
    act(() => { result.current.addTodo('주간 점검', 'medium', '2099-01-01', '', 'weekly'); });
    const sid = result.current.recurrenceSeries[0].id;
    act(() => { result.current.importRecurrenceSeries([{ ...result.current.recurrenceSeries[0], memoIds: ['m1', 'm2'] }]); });

    act(() => { result.current.pruneMemoLinks(['m2']); });

    expect(result.current.recurrenceSeries.find(s => s.id === sid)!.memoIds).toEqual(['m2']);
  });

  it('지워진 메모로의 연결은 실행취소로 삭제한 할 일을 되살려도 다시 생기지 않는다', () => {
    const { result } = renderHook(() => useTodos());
    act(() => { result.current.addTodo('업무', 'medium', '', ''); });
    const id = result.current.allTodos[0].id;
    act(() => { result.current.linkMemoToTodo(id, 'gone'); });
    act(() => { result.current.deleteTodo(id); });
    act(() => { result.current.pruneMemoLinks([]); }); // 그 사이 메모가 지워짐

    act(() => { result.current.performUndo(); });

    expect(result.current.allTodos[0].memoIds).toBeUndefined();
  });
});
