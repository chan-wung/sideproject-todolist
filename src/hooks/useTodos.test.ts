import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTodos, migrateTodo, validateTodos, validateCompletionLog } from './useTodos';
import { validateRecurrenceSeries } from '../utils/recurrence';

describe('useTodos', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('migrateTodo', () => {
    it('migrates memoId to memoIds', () => {
      const raw: unknown = { id: '1', text: 't', memoId: 'm1' };
      const migrated = migrateTodo(raw);
      expect(migrated.memoIds).toEqual(['m1']);
      expect('memoId' in migrated).toBe(false);
    });

    it('keeps existing memoIds', () => {
      const raw: unknown = { id: '1', text: 't', memoIds: ['m1', 'm2'] };
      const migrated = migrateTodo(raw);
      expect(migrated.memoIds).toEqual(['m1', 'm2']);
      expect('memoId' in migrated).toBe(false);
    });

    it('handles missing memoId', () => {
      const result = migrateTodo({ id: '1', text: 'test' });
      expect(result.memoIds).toBeUndefined();
    });

    it('ignores empty string memoId', () => {
      const result = migrateTodo({ id: '1', text: 'test', memoId: '' });
      expect(result.memoIds).toBeUndefined();
    });
  });

  describe('hook functionality', () => {
    it('addTodo adds an item to the front and trims text', () => {
      const { result } = renderHook(() => useTodos());
      act(() => {
        result.current.addTodo('  first task  ', 'medium', '', '');
      });
      expect(result.current.allTodos[0].text).toBe('first task');

      act(() => {
        result.current.addTodo('second task', 'medium', '', '');
      });
      expect(result.current.allTodos[0].text).toBe('second task');
      expect(result.current.allTodos.length).toBe(2);
    });

    it('addTodo ignores empty text', () => {
      const { result } = renderHook(() => useTodos());
      act(() => {
        result.current.addTodo('   ', 'medium', '', '');
      });
      expect(result.current.allTodos.length).toBe(0);
    });

    it('duplicateTodo inserts an uncompleted copy right after the original', () => {
      const { result } = renderHook(() => useTodos());
      act(() => {
        result.current.addTodo('template', 'high', '2026-07-20', 'work');
      });
      const id = result.current.allTodos[0].id;
      act(() => {
        result.current.addSubtask(id, 'sub1');
      });
      const subId = result.current.allTodos[0].subtasks![0].id;
      act(() => {
        result.current.toggleSubtask(id, subId); // 하위 항목 전체 완료 → 본체도 완료 처리됨
      });
      expect(result.current.allTodos[0].completed).toBe(true);

      act(() => {
        result.current.duplicateTodo(id);
      });

      expect(result.current.allTodos.length).toBe(2);
      const copy = result.current.allTodos[1];
      expect(copy.text).toBe('template (복사)');
      expect(copy.id).not.toBe(id);
      expect(copy.completed).toBe(false);
      expect(copy.completedAt).toBeUndefined();
      expect(copy.priority).toBe('high');
      expect(copy.dueDate).toBe('2026-07-20');
      expect(copy.category).toBe('work');
      expect(copy.subtasks).toHaveLength(1);
      expect(copy.subtasks![0].text).toBe('sub1');
      expect(copy.subtasks![0].completed).toBe(false);
      expect(copy.subtasks![0].id).not.toBe(subId);
    });

    it('duplicateTodo ignores unknown id', () => {
      const { result } = renderHook(() => useTodos());
      act(() => {
        result.current.addTodo('task', 'medium', '', '');
      });
      act(() => {
        result.current.duplicateTodo('no-such-id');
      });
      expect(result.current.allTodos.length).toBe(1);
    });

    it('toggleTodo toggles completion', () => {
      const { result } = renderHook(() => useTodos());
      act(() => {
        result.current.addTodo('test', 'medium', '', '');
      });
      const id = result.current.allTodos[0].id;

      act(() => {
        result.current.toggleTodo(id);
      });
      expect(result.current.allTodos[0].completed).toBe(true);

      act(() => {
        result.current.toggleTodo(id);
      });
      expect(result.current.allTodos[0].completed).toBe(false);
    });

    it('toggleTodo just toggles completion without spawning occurrences', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-07-02T10:00:00'));

      const { result } = renderHook(() => useTodos());
      act(() => {
        result.current.addTodo('recurring', 'medium', '2026-07-02', '', 'daily');
      });
      // 반복 주기를 지정하면 시리즈가 만들어지고 오늘 회차 1건이 생성됨
      expect(result.current.recurrenceSeries.length).toBe(1);
      expect(result.current.allTodos.length).toBe(1);
      const occId = result.current.allTodos[0].id;

      act(() => { result.current.toggleTodo(occId); });
      expect(result.current.allTodos[0].completed).toBe(true);
      // 완료해도, 해제/재완료를 반복해도 회차 수는 그대로 (생성은 예정일에 materializer가 담당)
      act(() => { result.current.toggleTodo(occId); });
      act(() => { result.current.toggleTodo(occId); });
      expect(result.current.allTodos.length).toBe(1);

      vi.useRealTimers();
    });

    it('deleteTodo and performUndo', () => {
      const { result } = renderHook(() => useTodos());
      act(() => {
        result.current.addTodo('test', 'medium', '', '');
      });
      const id = result.current.allTodos[0].id;

      act(() => {
        result.current.deleteTodo(id);
      });
      expect(result.current.allTodos.length).toBe(0);
      expect(result.current.undoMessage).toContain('삭제했습니다');

      act(() => {
        result.current.performUndo();
      });
      expect(result.current.allTodos.length).toBe(1);
      expect(result.current.undoMessage).toBeNull();
    });

    it('linkMemoToTodo and unlinkMemoFromTodo', () => {
      const { result } = renderHook(() => useTodos());
      act(() => {
        result.current.addTodo('test', 'medium', '', '');
      });
      const id = result.current.allTodos[0].id;

      act(() => {
        result.current.linkMemoToTodo(id, 'memo-1');
      });
      expect(result.current.allTodos[0].memoIds).toEqual(['memo-1']);

      // duplicate link
      act(() => {
        result.current.linkMemoToTodo(id, 'memo-1');
      });
      expect(result.current.allTodos[0].memoIds).toEqual(['memo-1']);

      act(() => {
        result.current.linkMemoToTodo(id, 'memo-2');
      });
      expect(result.current.allTodos[0].memoIds).toEqual(['memo-1', 'memo-2']);

      act(() => {
        result.current.unlinkMemoFromTodo(id, 'memo-1');
      });
      expect(result.current.allTodos[0].memoIds).toEqual(['memo-2']);

      // unlink last one
      act(() => {
        result.current.unlinkMemoFromTodo(id, 'memo-2');
      });
      expect(result.current.allTodos[0].memoIds).toBeUndefined();
    });

    it('pruneMemoLinks', () => {
      const { result } = renderHook(() => useTodos());
      act(() => {
        result.current.addTodo('test', 'medium', '', '');
      });
      const id = result.current.allTodos[0].id;

      act(() => {
        result.current.updateTodo(id, { memoIds: ['memo-1', 'memo-2'] });
      });

      act(() => {
        // Only memo-1 exists
        result.current.pruneMemoLinks(['memo-1']);
      });
      expect(result.current.allTodos[0].memoIds).toEqual(['memo-1']);

      act(() => {
        // No memos exist
        result.current.pruneMemoLinks([]);
      });
      expect(result.current.allTodos[0].memoIds).toBeUndefined();
    });

    it('validateTodos migrates data and prevents invalid formats', () => {
      const valid = validateTodos([
        { id: '1', text: 't1', memoId: 'memo-1' }
      ]);
      expect(valid).not.toBeNull();
      expect(valid![0].memoIds).toEqual(['memo-1']);
      expect(valid![0].priority).toBe('medium');

      const fail = validateTodos([
        { noId: 'invalid' }
      ]);
      expect(fail).toBeNull();
    });

    it('toggleSubtasksCollapsed / collapseAllSubtasks / expandAllSubtasks', () => {
      const { result } = renderHook(() => useTodos());
      act(() => {
        result.current.addTodo('parent', 'medium', '', '');
      });
      const pId = result.current.allTodos[0].id;

      act(() => {
        result.current.addSubtask(pId, 'child 1');
      });

      act(() => {
        result.current.toggleSubtasksCollapsed(pId);
      });
      expect(result.current.allTodos[0].subtasksCollapsed).toBe(true);

      act(() => {
        result.current.expandAllSubtasks();
      });
      expect(result.current.allTodos[0].subtasksCollapsed).toBe(false);

      act(() => {
        result.current.collapseAllSubtasks();
      });
      expect(result.current.allTodos[0].subtasksCollapsed).toBe(true);
    });

    it('addSubtask automatically expands if collapsed', () => {
      const { result } = renderHook(() => useTodos());
      act(() => {
        result.current.addTodo('parent', 'medium', '', '');
      });
      const pId = result.current.allTodos[0].id;

      act(() => {
        result.current.toggleSubtasksCollapsed(pId);
        result.current.addSubtask(pId, 'child');
      });
      expect(result.current.allTodos[0].subtasksCollapsed).toBe(false);
    });
  });

  describe('completionLog', () => {
    it('clearCompleted logs only completed items, and deleting an incomplete item logs nothing', () => {
      const { result } = renderHook(() => useTodos());
      act(() => {
        result.current.addTodo('done task', 'high', '', '업무');
        result.current.addTodo('active task', 'low', '', '개인');
      });
      const doneId = result.current.allTodos.find(t => t.text === 'done task')!.id;
      const activeId = result.current.allTodos.find(t => t.text === 'active task')!.id;

      act(() => {
        result.current.toggleTodo(doneId);
      });
      act(() => {
        result.current.clearCompleted();
      });

      expect(result.current.allTodos.some(t => t.id === doneId)).toBe(false);
      expect(result.current.completionLog.length).toBe(1);
      expect(result.current.completionLog[0]).toMatchObject({ id: doneId, text: 'done task', category: '업무', priority: 'high' });

      act(() => {
        result.current.deleteTodo(activeId);
      });
      expect(result.current.completionLog.length).toBe(1); // 미완료 항목 삭제는 기록되지 않음
    });

    it('clearCompleted preserves subtasks (text + completed) in the log entry', () => {
      const { result } = renderHook(() => useTodos());
      act(() => {
        result.current.addTodo('parent task', 'medium', '', '');
      });
      const id = result.current.allTodos[0].id;
      act(() => {
        result.current.addSubtask(id, 'sub A');
        result.current.addSubtask(id, 'sub B');
      });
      const subAId = result.current.allTodos[0].subtasks![0].id;
      act(() => {
        result.current.toggleSubtask(id, subAId);
      });
      act(() => {
        result.current.toggleTodo(id);
      });
      act(() => {
        result.current.clearCompleted();
      });

      expect(result.current.completionLog[0].subtasks).toEqual([
        { text: 'sub A', completed: true },
        { text: 'sub B', completed: true },
      ]);
    });

    it('deleteTodo logs an individually-deleted completed item', () => {
      const { result } = renderHook(() => useTodos());
      act(() => {
        result.current.addTodo('finished', 'medium', '', '');
      });
      const id = result.current.allTodos[0].id;
      act(() => {
        result.current.toggleTodo(id);
      });
      act(() => {
        result.current.deleteTodo(id);
      });
      expect(result.current.completionLog.length).toBe(1);
      expect(result.current.completionLog[0].id).toBe(id);
    });

    it('performUndo also reverts the completion log', () => {
      const { result } = renderHook(() => useTodos());
      act(() => {
        result.current.addTodo('finished', 'medium', '', '');
      });
      const id = result.current.allTodos[0].id;
      act(() => {
        result.current.toggleTodo(id);
      });
      act(() => {
        result.current.deleteTodo(id);
      });
      expect(result.current.completionLog.length).toBe(1);

      act(() => {
        result.current.performUndo();
      });
      expect(result.current.completionLog.length).toBe(0);
      expect(result.current.allTodos.some(t => t.id === id)).toBe(true);
    });

    it('resetCompletionLog clears the log', () => {
      const { result } = renderHook(() => useTodos());
      act(() => {
        result.current.addTodo('finished', 'medium', '', '');
      });
      const id = result.current.allTodos[0].id;
      act(() => {
        result.current.toggleTodo(id);
      });
      act(() => {
        result.current.deleteTodo(id);
      });
      expect(result.current.completionLog.length).toBe(1);

      act(() => {
        result.current.resetCompletionLog();
      });
      expect(result.current.completionLog.length).toBe(0);
    });
  });

  describe('localStorage migration', () => {
    it('migrates raw stored data on init', () => {
      localStorage.setItem('todolist-items', JSON.stringify([{ id: '1', text: 't', memoId: 'memo-a' }]));
      const { result } = renderHook(() => useTodos());
      expect(result.current.allTodos[0].memoIds).toEqual(['memo-a']);
    });
  });

  describe('recurrence series', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it('addTodo with a recurrence creates a series and materializes the due occurrence', () => {
      vi.setSystemTime(new Date('2026-07-10T10:00:00'));
      const { result } = renderHook(() => useTodos());
      act(() => {
        result.current.addTodo('봄내소식지', 'medium', '2026-07-10', '홍보', 'monthly');
      });

      expect(result.current.recurrenceSeries).toHaveLength(1);
      const s = result.current.recurrenceSeries[0];
      expect(s.frequency).toBe('monthly');
      expect(s.anchorDate).toBe('2026-07-10');

      const occ = result.current.allTodos.filter(t => t.seriesId === s.id);
      expect(occ).toHaveLength(1);
      expect(occ[0].dueDate).toBe('2026-07-10');
      expect(occ[0].category).toBe('홍보');
      // 레거시 recurrence 필드는 회차에 남기지 않음
      expect(occ[0].recurrence).toBeUndefined();
    });

    it("next month's occurrence appears on reopen even if the previous one was never completed", () => {
      vi.setSystemTime(new Date('2026-07-10T10:00:00'));
      const { result, unmount } = renderHook(() => useTodos());
      act(() => {
        result.current.addTodo('봄내소식지', 'medium', '2026-07-10', '홍보', 'monthly');
      });
      const sid = result.current.recurrenceSeries[0].id;
      // 완료하지 않고 그대로 둔다

      vi.setSystemTime(new Date('2026-08-10T09:00:00'));
      unmount();
      const { result: reopened } = renderHook(() => useTodos());

      const dates = reopened.current.allTodos
        .filter(t => t.seriesId === sid)
        .map(t => t.dueDate)
        .sort();
      expect(dates).toEqual(['2026-07-10', '2026-08-10']);
    });

    it('does not duplicate an occurrence that already exists for the same date', () => {
      vi.setSystemTime(new Date('2026-07-10T10:00:00'));
      const { result, unmount } = renderHook(() => useTodos());
      act(() => {
        result.current.addTodo('daily thing', 'low', '2026-07-10', '', 'daily');
      });
      const sid = result.current.recurrenceSeries[0].id;
      const countDay1 = result.current.allTodos.filter(t => t.seriesId === sid).length;
      expect(countDay1).toBe(1);

      // 같은 날 앱을 다시 열어도 중복 생성되지 않음
      unmount();
      const { result: reopened } = renderHook(() => useTodos());
      expect(reopened.current.allTodos.filter(t => t.seriesId === sid).length).toBe(1);
    });

    it('daily catch-up is capped to the last 14 days', () => {
      vi.setSystemTime(new Date('2026-07-01T10:00:00'));
      const { result, unmount } = renderHook(() => useTodos());
      act(() => {
        result.current.addTodo('daily', 'low', '2026-07-01', '', 'daily');
      });
      const sid = result.current.recurrenceSeries[0].id;

      // 40일 뒤에야 다시 열어봄 → 최근 14일치만 생성
      vi.setSystemTime(new Date('2026-08-10T09:00:00'));
      unmount();
      const { result: reopened } = renderHook(() => useTodos());
      const dates = reopened.current.allTodos.filter(t => t.seriesId === sid).map(t => t.dueDate).sort();
      expect(dates[0]).toBe('2026-07-01'); // 첫날 회차는 이미 있던 것
      expect(dates).toContain('2026-08-10');
      expect(dates).not.toContain('2026-07-15'); // 14일 캡 바깥은 건너뜀
      expect(dates.length).toBeLessThanOrEqual(15);
    });

    it('endRecurrenceSeries stops new occurrences but keeps existing ones', () => {
      vi.setSystemTime(new Date('2026-07-10T10:00:00'));
      const { result, unmount } = renderHook(() => useTodos());
      act(() => {
        result.current.addTodo('봄내소식지', 'medium', '2026-07-10', '홍보', 'monthly');
      });
      const sid = result.current.recurrenceSeries[0].id;
      act(() => { result.current.endRecurrenceSeries(sid); });
      expect(result.current.recurrenceSeries[0].status).toBe('ended');

      vi.setSystemTime(new Date('2026-09-10T09:00:00'));
      unmount();
      const { result: reopened } = renderHook(() => useTodos());
      const dates = reopened.current.allTodos.filter(t => t.seriesId === sid).map(t => t.dueDate);
      expect(dates).toEqual(['2026-07-10']); // 종료 후 새 회차 없음, 기존 회차는 유지
    });

    it('deleteRecurrenceSeries removes the rule but detaches (keeps) generated todos', () => {
      vi.setSystemTime(new Date('2026-07-10T10:00:00'));
      const { result } = renderHook(() => useTodos());
      act(() => {
        result.current.addTodo('봄내소식지', 'medium', '2026-07-10', '홍보', 'monthly');
      });
      const sid = result.current.recurrenceSeries[0].id;
      act(() => { result.current.deleteRecurrenceSeries(sid); });

      expect(result.current.recurrenceSeries).toHaveLength(0);
      expect(result.current.allTodos).toHaveLength(1);
      expect(result.current.allTodos[0].seriesId).toBeUndefined();
    });

    it('migrates a legacy recurrence chain into a series and fills the missed occurrence', () => {
      vi.setSystemTime(new Date('2026-08-26T09:00:00'));
      // 지난달 회차만 있고 이번달 회차가 누락된 레거시 데이터
      localStorage.setItem('todolist-items', JSON.stringify([
        {
          id: 'legacy-1', text: '봄내소식지', completed: false, priority: 'medium',
          category: '홍보', createdAt: '2026-07-24T00:00:00.000Z',
          dueDate: '2026-07-24', recurrence: 'monthly',
        },
      ]));

      const { result } = renderHook(() => useTodos());

      expect(result.current.recurrenceSeries).toHaveLength(1);
      const s = result.current.recurrenceSeries[0];
      expect(s.frequency).toBe('monthly');
      expect(s.anchorDate).toBe('2026-07-24');

      // 기존 항목은 시리즈에 연결되고 레거시 필드는 제거됨
      const legacy = result.current.allTodos.find(t => t.id === 'legacy-1')!;
      expect(legacy.seriesId).toBe(s.id);
      expect(legacy.recurrence).toBeUndefined();

      // 누락됐던 이번달(8/24) 회차가 생성됨
      const dates = result.current.allTodos.filter(t => t.seriesId === s.id).map(t => t.dueDate).sort();
      expect(dates).toEqual(['2026-07-24', '2026-08-24']);
    });
  });

  describe('업무 종류(kind)', () => {
    it('옛 데이터(kind 없음)와 알 수 없는 값은 일반 업무(task)로 불러온다', () => {
      const todos = validateTodos([
        { id: '1', text: '옛 데이터' },
        { id: '2', text: '이상한 값', kind: 'vacation' },
        { id: '3', text: '연차', kind: 'leave' },
      ]);
      expect(todos!.map(t => t.kind)).toEqual(['task', 'task', 'leave']);

      const log = validateCompletionLog([
        { id: 'a', text: '옛 이력', completedAt: '2026-11-02T10:00:00' },
        { id: 'b', text: '정기', completedAt: '2026-11-02T10:00:00', kind: 'routine' },
      ]);
      expect(log!.map(e => e.kind)).toEqual(['task', 'routine']);

      const series = validateRecurrenceSeries([
        { id: 's1', text: '옛 시리즈', frequency: 'weekly', anchorDate: '2026-11-02' },
        { id: 's2', text: '정기', frequency: 'weekly', anchorDate: '2026-11-02', kind: 'routine' },
      ]);
      expect(series!.map(s => s.kind)).toEqual(['task', 'routine']);
    });

    it('addTodo는 종류를 저장하고, 안 주면 task다', () => {
      const { result } = renderHook(() => useTodos());
      act(() => {
        result.current.addTodo('일반', 'medium', '', '');
        result.current.addTodo('연차', 'medium', '2026-11-04', '', 'none', 'leave');
      });
      const byText = (text: string) => result.current.allTodos.find(t => t.text === text)!;
      expect(byText('일반').kind).toBe('task');
      expect(byText('연차').kind).toBe('leave');
    });

    it('종류를 고르고 반복을 걸면 시리즈와 그 회차가 같은 종류를 이어받는다', () => {
      vi.useFakeTimers();
      try {
        vi.setSystemTime(new Date('2026-11-02T10:00:00'));
        const { result } = renderHook(() => useTodos());
        act(() => {
          result.current.addTodo('바이러스 검사', 'medium', '2026-11-02', '', 'weekly', 'routine');
        });
        expect(result.current.recurrenceSeries[0].kind).toBe('routine');
        const occ = result.current.allTodos.filter(t => t.seriesId === result.current.recurrenceSeries[0].id);
        expect(occ).toHaveLength(1);
        expect(occ[0].kind).toBe('routine');
      } finally {
        vi.useRealTimers();
      }
    });

    it('완료한 항목을 지우면 완료 이력에도 종류가 남는다', () => {
      const { result } = renderHook(() => useTodos());
      act(() => {
        result.current.addTodo('정기 점검', 'medium', '', '', 'none', 'routine');
      });
      const id = result.current.allTodos[0].id;
      act(() => {
        result.current.toggleTodo(id);
      });
      act(() => {
        result.current.deleteTodo(id);
      });
      expect(result.current.completionLog[0].kind).toBe('routine');
    });

    it('updateTodo로 종류를 바꿀 수 있다', () => {
      const { result } = renderHook(() => useTodos());
      act(() => {
        result.current.addTodo('업무', 'medium', '', '');
      });
      const id = result.current.allTodos[0].id;
      act(() => {
        result.current.updateTodo(id, { kind: 'leave' });
      });
      expect(result.current.allTodos[0].kind).toBe('leave');
    });
  });

  describe('완료 이력의 마감일(dueDate)', () => {
    it('완료한 연차를 지우면 이력에 날짜가 남고, 불러올 때도 유지된다', () => {
      const { result } = renderHook(() => useTodos());
      act(() => {
        result.current.addTodo('연차', 'medium', '2026-11-04', '', 'none', 'leave');
      });
      const id = result.current.allTodos[0].id;
      act(() => {
        result.current.toggleTodo(id);
      });
      act(() => {
        result.current.deleteTodo(id);
      });
      expect(result.current.completionLog[0].dueDate).toBe('2026-11-04');

      const reloaded = validateCompletionLog(JSON.parse(JSON.stringify(result.current.completionLog)));
      expect(reloaded![0].dueDate).toBe('2026-11-04');
      expect(validateCompletionLog([{ id: 'x', text: 't', completedAt: '2026-11-01T00:00:00' }])![0].dueDate).toBeUndefined();
    });
  });

  describe('완료 이력 한 건 삭제', () => {
    it('deleteCompletionLogEntry는 지정한 이력 하나만 지운다', () => {
      const { result } = renderHook(() => useTodos());
      act(() => {
        result.current.importCompletionLog([
          { id: 'a', text: '잘못 완료', category: '기본', priority: 'medium', completedAt: '2026-11-03T10:00:00' },
          { id: 'b', text: '정상 1', category: '기본', priority: 'medium', completedAt: '2026-11-03T11:00:00' },
          { id: 'c', text: '정상 2', category: '기본', priority: 'medium', completedAt: '2026-11-04T09:00:00' },
        ]);
      });
      act(() => {
        result.current.deleteCompletionLogEntry({ id: 'a', completedAt: '2026-11-03T10:00:00' });
      });
      expect(result.current.completionLog.map(e => e.id)).toEqual(['b', 'c']);
    });

    it('같은 id가 겹쳐 있어도 완료 시각까지 같은 한 건만 지운다', () => {
      const { result } = renderHook(() => useTodos());
      act(() => {
        result.current.importCompletionLog([
          { id: 'dup', text: '같은 id 1', category: '기본', priority: 'medium', completedAt: '2026-11-03T10:00:00' },
          { id: 'dup', text: '같은 id 2', category: '기본', priority: 'medium', completedAt: '2026-11-04T10:00:00' },
        ]);
      });
      act(() => {
        result.current.deleteCompletionLogEntry({ id: 'dup', completedAt: '2026-11-03T10:00:00' });
      });
      expect(result.current.completionLog.map(e => e.text)).toEqual(['같은 id 2']);
    });

    it('없는 이력을 지우려 해도 아무것도 바뀌지 않는다', () => {
      const { result } = renderHook(() => useTodos());
      act(() => {
        result.current.importCompletionLog([
          { id: 'a', text: '하나', category: '기본', priority: 'medium', completedAt: '2026-11-03T10:00:00' },
        ]);
      });
      act(() => {
        result.current.deleteCompletionLogEntry({ id: 'zzz', completedAt: '2026-11-03T10:00:00' });
      });
      expect(result.current.completionLog).toHaveLength(1);
    });
  });

});
