import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useState, useRef } from 'react';
import { useRecurrenceSeries } from './useRecurrenceSeries';
import type { Todo } from '../types/todo';

// useTodos가 하는 것처럼 todos 상태·ref를 만들어 넘겨 useRecurrenceSeries만 따로 검증한다.
function setup() {
  return renderHook(() => {
    const [todos, setTodos] = useState<Todo[]>([]);
    const todosRef = useRef(todos);
    todosRef.current = todos;
    const series = useRecurrenceSeries(todosRef, setTodos);
    return { todos, ...series };
  });
}

const base = { text: '주간 점검', category: '기본', priority: 'medium' as const, frequency: 'weekly' as const };

describe('useRecurrenceSeries', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-10T10:00:00'));
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('기준일이 오늘이면 시리즈를 저장하고 첫 회차를 만든다', () => {
    const { result } = setup();
    act(() => { result.current.addRecurrenceSeries({ ...base, anchorDate: '2026-07-10' }); });

    expect(result.current.recurrenceSeries).toHaveLength(1);
    expect(result.current.todos.map(t => t.dueDate)).toEqual(['2026-07-10']);
    expect(JSON.parse(localStorage.getItem('todolist-recurrence-series')!)).toHaveLength(1);
  });

  it('기준일이 미래면 회차 없이 시리즈만 저장한다', () => {
    const { result } = setup();
    act(() => { result.current.addRecurrenceSeries({ ...base, anchorDate: '2026-07-20' }); });

    expect(result.current.recurrenceSeries).toHaveLength(1);
    expect(result.current.todos).toHaveLength(0);
  });

  it('글자가 비었거나 기준일이 없으면 만들지 않는다', () => {
    const { result } = setup();
    act(() => { result.current.addRecurrenceSeries({ ...base, text: '   ', anchorDate: '2026-07-10' }); });
    act(() => { result.current.addRecurrenceSeries({ ...base, anchorDate: '' }); });
    expect(result.current.recurrenceSeries).toHaveLength(0);
  });

  it('주기를 바꾸면 오늘까지 채워진 것으로 보고 다시 활성화한다', () => {
    const { result } = setup();
    act(() => { result.current.addRecurrenceSeries({ ...base, anchorDate: '2026-07-10' }); });
    const id = result.current.recurrenceSeries[0].id;
    act(() => { result.current.endRecurrenceSeries(id); });
    expect(result.current.recurrenceSeries[0].status).toBe('ended');

    act(() => { result.current.updateRecurrenceSeries(id, { frequency: 'monthly' }); });
    const s = result.current.recurrenceSeries[0];
    expect(s.frequency).toBe('monthly');
    expect(s.status).toBe('active');
    expect(s.lastMaterializedDate).toBe('2026-07-10');
  });

  it('주기·기준일이 그대로면 상태와 커서를 건드리지 않고, 종료일은 비우면 지운다', () => {
    const { result } = setup();
    act(() => { result.current.addRecurrenceSeries({ ...base, anchorDate: '2026-07-10', endDate: '2026-12-31' }); });
    const id = result.current.recurrenceSeries[0].id;
    const before = result.current.recurrenceSeries[0].lastMaterializedDate;

    act(() => { result.current.updateRecurrenceSeries(id, { text: '이름만 변경', endDate: '' }); });
    const s = result.current.recurrenceSeries[0];
    expect(s.text).toBe('이름만 변경');
    expect(s.endDate).toBeUndefined();
    expect(s.lastMaterializedDate).toBe(before);
  });

  it('종료한 시리즈를 재개하면 활성이 되고 커서가 오늘로 간다', () => {
    const { result } = setup();
    act(() => { result.current.addRecurrenceSeries({ ...base, anchorDate: '2026-07-10' }); });
    const id = result.current.recurrenceSeries[0].id;
    act(() => { result.current.endRecurrenceSeries(id); });

    vi.setSystemTime(new Date('2026-08-01T09:00:00'));
    act(() => { result.current.resumeRecurrenceSeries(id); });
    const s = result.current.recurrenceSeries[0];
    expect(s.status).toBe('active');
    expect(s.lastMaterializedDate).toBe('2026-08-01');
  });

  it('창이 다시 활성화되면 새로 도래한 회차를 만든다', () => {
    const { result } = setup();
    act(() => { result.current.addRecurrenceSeries({ ...base, anchorDate: '2026-07-10' }); });
    expect(result.current.todos).toHaveLength(1);

    vi.setSystemTime(new Date('2026-07-17T09:00:00'));
    act(() => { window.dispatchEvent(new Event('focus')); });
    expect(result.current.todos.map(t => t.dueDate).sort()).toEqual(['2026-07-10', '2026-07-17']);
  });

  it('export/import로 시리즈 목록을 주고받는다', () => {
    const { result } = setup();
    act(() => { result.current.addRecurrenceSeries({ ...base, anchorDate: '2026-07-10' }); });
    const exported = result.current.exportRecurrenceSeries();

    act(() => { result.current.importRecurrenceSeries([]); });
    expect(result.current.recurrenceSeries).toHaveLength(0);
    act(() => { result.current.importRecurrenceSeries(exported); });
    expect(result.current.recurrenceSeries).toHaveLength(1);
  });
});
