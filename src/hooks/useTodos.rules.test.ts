import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useTodos } from './useTodos';
import type { Todo } from '../types/todo';

// 날짜·반복·연차 규칙
describe('useTodos 날짜·반복·종류 규칙', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-10T10:00:00')); // 금요일
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    localStorage.clear();
  });

  const todo = (overrides: Partial<Todo>): Todo => ({
    id: 'x', text: '업무', completed: false, priority: 'medium', category: '기본', createdAt: '2026-07-01T09:00:00', ...overrides,
  });

  it('자정이 지나면 화면을 계속 보고 있어도 새 회차가 만들어진다', () => {
    vi.setSystemTime(new Date('2026-07-10T23:59:00'));
    const { result } = renderHook(() => useTodos());
    act(() => { result.current.addTodo('일일 점검', 'medium', '2026-07-10', '', 'daily'); });
    expect(result.current.allTodos.map(t => t.dueDate)).toEqual(['2026-07-10']);

    act(() => { vi.advanceTimersByTime(2 * 60 * 1000); }); // 자정 통과
    expect(result.current.allTodos.map(t => t.dueDate).sort()).toEqual(['2026-07-10', '2026-07-11']);
  });

  it('focus와 visibilitychange가 잇따라 와도 같은 회차를 두 번 만들지 않는다', () => {
    const { result } = renderHook(() => useTodos());
    act(() => { result.current.addTodo('주간 점검', 'medium', '2026-07-10', '', 'weekly'); });

    vi.setSystemTime(new Date('2026-07-17T09:00:00'));
    act(() => {
      window.dispatchEvent(new Event('focus'));
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
    });
    expect(result.current.allTodos.map(t => t.dueDate).sort()).toEqual(['2026-07-10', '2026-07-17']);
  });

  it('백업을 가져온 직후 구형 반복 데이터가 시리즈로 이행되고 도래 회차가 생긴다', () => {
    const { result } = renderHook(() => useTodos());
    act(() => {
      result.current.importData([todo({ id: 'old', dueDate: '2026-07-03', recurrence: 'weekly' })]);
    });
    expect(result.current.recurrenceSeries).toHaveLength(1);
    expect(result.current.allTodos.some(t => t.dueDate === '2026-07-10' && t.seriesId === result.current.recurrenceSeries[0].id)).toBe(true);
  });

  it('백업을 가져온 직후 지난 연차는 바로 완료 처리된다', () => {
    const { result } = renderHook(() => useTodos());
    act(() => {
      result.current.importData([todo({ id: 'l', kind: 'leave', dueDate: '2026-07-01' }), todo({ id: 'f', kind: 'leave', dueDate: '2026-07-20' })]);
    });
    expect(result.current.allTodos.find(t => t.id === 'l')!.completed).toBe(true);
    expect(result.current.allTodos.find(t => t.id === 'f')!.completed).toBe(false);
  });

  it('과거 날짜로 새 연차를 등록하면 바로 완료 처리된다', () => {
    const { result } = renderHook(() => useTodos());
    act(() => { result.current.addTodo('연차', 'medium', '2026-07-01', '', 'none', 'leave'); });
    expect(result.current.allTodos[0].completed).toBe(true);
  });

  it('연차는 반복·시작일을 받지 않는다', () => {
    const { result } = renderHook(() => useTodos());
    act(() => { result.current.addTodo('연차', 'medium', '2026-07-20', '', 'weekly', 'leave', '2026-07-15'); });
    expect(result.current.recurrenceSeries).toHaveLength(0);
    expect(result.current.allTodos[0].startDate).toBeUndefined();
    expect(result.current.allTodos[0].dueDate).toBe('2026-07-20');
  });

  it('종류를 연차로 바꾸면 시작일·메모 연결을 지우고 반복 승격도 하지 않는다', () => {
    const { result } = renderHook(() => useTodos());
    act(() => { result.current.addTodo('업무', 'medium', '2026-07-20', '', 'none', 'task', '2026-07-15'); });
    const id = result.current.allTodos[0].id;
    act(() => { result.current.linkMemoToTodo(id, 'm1'); });

    act(() => { result.current.updateTodo(id, { kind: 'leave', recurrence: 'weekly' }); });

    const t = result.current.allTodos[0];
    expect(t.kind).toBe('leave');
    expect(t.startDate).toBeUndefined();
    expect(t.memoIds).toBeUndefined();
    expect(result.current.recurrenceSeries).toHaveLength(0);
  });

  it('완료된 할 일에 미완료 하위 항목을 추가하면 다시 진행 중이 된다', () => {
    const { result } = renderHook(() => useTodos());
    act(() => { result.current.addTodo('업무', 'medium', '', ''); });
    const id = result.current.allTodos[0].id;
    act(() => { result.current.toggleTodo(id); });
    expect(result.current.allTodos[0].completed).toBe(true);

    act(() => { result.current.addSubtask(id, '추가 작업'); });

    expect(result.current.allTodos[0].completed).toBe(false);
    expect(result.current.allTodos[0].completedAt).toBeUndefined();
  });

  describe('이번주 마감 필터 (월~일)', () => {
    const scopeIds = (today: string) => {
      vi.setSystemTime(new Date(`${today}T10:00:00`));
      const { result } = renderHook(() => useTodos());
      act(() => {
        result.current.importData([
          todo({ id: 'mon', dueDate: '2026-11-02' }), todo({ id: 'sun', dueDate: '2026-11-08' }),
          todo({ id: 'next', dueDate: '2026-11-09' }), todo({ id: 'prev', dueDate: '2026-11-01' }),
        ]);
        result.current.setFilterStatus('all');
        result.current.setDueScope('week');
      });
      const ids = result.current.filteredTodos.map(t => t.id).sort();
      cleanup();
      return ids;
    };

    it.each(['2026-11-06', '2026-11-08', '2026-11-02'])('%s에도 같은 주(11/2~11/8)만 나온다', today => {
      expect(scopeIds(today)).toEqual(['mon', 'sun']);
    });

    it('월요일(11/9)이 되면 다음 주로 바뀐다', () => {
      expect(scopeIds('2026-11-09')).toEqual(['next']);
    });

    it('월·연도 경계: 2026-12-31(목)이 속한 주는 2027-01-03까지', () => {
      vi.setSystemTime(new Date('2026-12-31T10:00:00'));
      const { result } = renderHook(() => useTodos());
      act(() => {
        result.current.importData([todo({ id: 'a', dueDate: '2027-01-03' }), todo({ id: 'b', dueDate: '2027-01-04' })]);
        result.current.setFilterStatus('all');
        result.current.setDueScope('week');
      });
      expect(result.current.filteredTodos.map(t => t.id)).toEqual(['a']);
    });
  });
});
