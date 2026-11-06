import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { usePersistentState, oneOf } from './usePersistentState';
import { useTodos } from './useTodos';
import { useMemos } from './useMemos';
import { useWeeklyReports } from './useWeeklyReports';
import { validateWeeklyReportData } from '../utils/weeklyReportData';
import { validateTodos, validateCompletionLog } from '../utils/todoData';
import { isValidDateStr } from '../utils/date';
import { CORRUPT_BACKUP_PREFIX } from '../utils/storage';

describe('저장 데이터 검증', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.useRealTimers();
    localStorage.clear();
  });

  it('모양이 틀린 값은 기본값으로 시작하고 원문을 따로 보관한다', () => {
    localStorage.setItem('k', JSON.stringify({ a: 1 }));
    const { result } = renderHook(() => usePersistentState<string[]>('k', []));
    expect(result.current[0]).toEqual([]);
    expect(localStorage.getItem(CORRUPT_BACKUP_PREFIX + 'k')).toBe('{"a":1}');
  });

  it('깨진 JSON도 앱을 멈추지 않고 원문을 보관한다', () => {
    localStorage.setItem('k', '{깨진');
    const { result } = renderHook(() => usePersistentState<boolean>('k', true));
    expect(result.current[0]).toBe(true);
    expect(localStorage.getItem(CORRUPT_BACKUP_PREFIX + 'k')).toBe('{깨진');
  });

  it('보관본은 처음 것을 지키고 덮어쓰지 않는다', () => {
    localStorage.setItem('k', '{"a":1}');
    renderHook(() => usePersistentState<string>('k', ''));
    cleanup();
    localStorage.setItem('k', '{"b":2}');
    renderHook(() => usePersistentState<string>('k', ''));
    expect(localStorage.getItem(CORRUPT_BACKUP_PREFIX + 'k')).toBe('{"a":1}');
  });

  it('정상 값은 그대로 읽고 보관본을 만들지 않는다', () => {
    localStorage.setItem('k', JSON.stringify('x'));
    const { result } = renderHook(() => usePersistentState<string>('k', ''));
    expect(result.current[0]).toBe('x');
    expect(localStorage.getItem(CORRUPT_BACKUP_PREFIX + 'k')).toBeNull();
  });

  it('허용 목록에 없는 설정값은 기본값으로 돌린다', () => {
    localStorage.setItem('f', JSON.stringify('엉뚱한값'));
    const { result } = renderHook(() => usePersistentState('f', 'active', oneOf('all', 'active', 'completed')));
    expect(result.current[0]).toBe('active');
  });

  it('완료 이력에 JSON 객체 {}가 저장돼 있어도 배열로 시작한다', () => {
    localStorage.setItem('todolist-completion-log', '{}');
    const { result } = renderHook(() => useTodos());
    expect(Array.isArray(result.current.completionLog)).toBe(true);
    expect(result.current.completionLog).toEqual([]);
    expect(localStorage.getItem(CORRUPT_BACKUP_PREFIX + 'todolist-completion-log')).toBe('{}');
  });

  it('null이 저장된 메모·주간보고·검색어도 안전하게 시작한다', () => {
    localStorage.setItem('todolist-memos-array', 'null');
    localStorage.setItem('todolist-weekly-reports', 'null');
    localStorage.setItem('todolist-pref-query', 'null');
    const memos = renderHook(() => useMemos());
    const reports = renderHook(() => useWeeklyReports());
    const todos = renderHook(() => useTodos());
    expect(memos.result.current.memos).toEqual([]);
    expect(reports.result.current.data).toEqual({ drafts: {}, copiedWeeks: [] });
    expect(todos.result.current.query).toBe('');
  });

  it('손상된 할 일 목록은 보관되고 앱은 빈 목록으로 시작한다', () => {
    localStorage.setItem('todolist-items', '{}');
    const { result } = renderHook(() => useTodos());
    expect(result.current.allTodos).toEqual([]);
    expect(localStorage.getItem(CORRUPT_BACKUP_PREFIX + 'todolist-items')).toBe('{}');
  });

  describe('실제 달력 날짜 검증', () => {
    it('isValidDateStr', () => {
      expect(isValidDateStr('2026-11-06')).toBe(true);
      expect(isValidDateStr('2024-02-29')).toBe(true);
      expect(isValidDateStr('2026-02-30')).toBe(false);
      expect(isValidDateStr('0000-invalid')).toBe(false);
      expect(isValidDateStr('2026-1-6')).toBe(false);
      expect(isValidDateStr(20261106)).toBe(false);
    });

    it('존재하지 않는 마감일·시작일은 버리고 나머지 데이터는 유지한다', () => {
      const [t] = validateTodos([{ id: 'a', text: '업무', dueDate: '2026-02-30', startDate: '2026-02-01' }])!;
      expect(t.dueDate).toBeUndefined();
      expect(t.startDate).toBeUndefined();
      expect(t.text).toBe('업무');
    });

    it('완료 이력의 잘못된 날짜도 버린다', () => {
      const [e] = validateCompletionLog([{ id: 'a', text: '업무', completedAt: '2026-11-03T10:00:00', dueDate: '0000-invalid' }])!;
      expect(e.dueDate).toBeUndefined();
    });

    it('dueDate가 0000-invalid인 연차가 저장돼 있어도 앱이 죽지 않는다', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-11-06T10:00:00'));
      localStorage.setItem('todolist-items', JSON.stringify([
        { id: 'l', text: '연차', completed: false, priority: 'medium', category: '기본', createdAt: '2026-11-01T09:00:00', kind: 'leave', dueDate: '0000-invalid' },
      ]));
      const { result } = renderHook(() => useTodos());
      expect(result.current.allTodos).toHaveLength(1);
      expect(result.current.allTodos[0].completed).toBe(false);
    });

    it('주간보고의 존재하지 않는 주 키는 조용히 받지 않는다', () => {
      expect(validateWeeklyReportData({ drafts: { '2026-02-30': '글' }, copiedWeeks: [] })).toBeNull();
      expect(validateWeeklyReportData({ drafts: {}, copiedWeeks: ['0000-invalid'] })).toBeNull();
      expect(validateWeeklyReportData({ drafts: { '2026-11-02': '글' }, copiedWeeks: ['2026-10-26'] })).not.toBeNull();
    });
  });

  it('저장 공간이 가득 차도 편집 내용은 메모리에 남는다', () => {
    const { result } = renderHook(() => usePersistentState<string>('k', ''));
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new DOMException('full', 'QuotaExceededError'); });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    act(() => { result.current[1]('쓰는 중'); });
    expect(result.current[0]).toBe('쓰는 중');
  });
});
