import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTodos, migrateTodo, validateTodos } from './useTodos';

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

    it('toggleTodo defers next occurrence until its due date actually arrives', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-07-02T10:00:00'));

      const { result, unmount } = renderHook(() => useTodos());
      act(() => {
        result.current.addTodo('recurring', 'medium', '', '');
      });
      act(() => {
        result.current.updateTodo(result.current.allTodos[0].id, {
          recurrence: 'daily',
          dueDate: '2026-07-02'
        });
      });

      const oldId = result.current.allTodos[0].id;

      act(() => {
        result.current.toggleTodo(oldId);
      });
      // 완료 당일에는 다음 회차가 아직 생성되지 않아야 함 (매일이면 '다음날' 생성)
      expect(result.current.allTodos.length).toBe(1);
      expect(result.current.allTodos[0].completed).toBe(true);

      // 당일 안에서 해제 → 재완료를 반복해도 여전히 생성되지 않음
      act(() => { result.current.toggleTodo(oldId); });
      act(() => { result.current.toggleTodo(oldId); });
      expect(result.current.allTodos.length).toBe(1);

      // 다음날, 앱을 다시 열면(리마운트) 그제서야 다음 회차가 생성됨
      vi.setSystemTime(new Date('2026-07-03T09:00:00'));
      unmount();
      const { result: reopened } = renderHook(() => useTodos());

      expect(reopened.current.allTodos.length).toBe(2);
      const created = reopened.current.allTodos.find(t => t.sourceId === oldId);
      expect(created).toBeDefined();
      expect(created!.completed).toBe(false);
      expect(created!.dueDate).toBe('2026-07-03');
      expect(reopened.current.allTodos.find(t => t.id === oldId)!.completed).toBe(true);

      // 이미 생성된 뒤에는 원본을 다시 해제/재완료해도 중복 생성되지 않음
      act(() => { reopened.current.toggleTodo(oldId); });
      act(() => { reopened.current.toggleTodo(oldId); });
      expect(reopened.current.allTodos.length).toBe(2);

      vi.useRealTimers();
    });

    it('toggleSubtask completing all subtasks also defers next occurrence until due date', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-07-02T10:00:00'));

      const { result, unmount } = renderHook(() => useTodos());
      act(() => {
        result.current.addTodo('recurring with subtasks', 'medium', '', '');
      });
      const id = result.current.allTodos[0].id;
      act(() => {
        result.current.updateTodo(id, { recurrence: 'daily', dueDate: '2026-07-02' });
      });
      act(() => {
        result.current.addSubtask(id, 'sub1');
      });
      const subId = result.current.allTodos[0].subtasks![0].id;

      act(() => {
        result.current.toggleSubtask(id, subId);
      });
      // 완료 당일에는 다음 회차가 아직 생성되지 않아야 함
      expect(result.current.allTodos.length).toBe(1);
      expect(result.current.allTodos[0].completed).toBe(true);

      // 다음날 앱을 다시 열면 그제서야 생성됨
      vi.setSystemTime(new Date('2026-07-03T09:00:00'));
      unmount();
      const { result: reopened } = renderHook(() => useTodos());

      expect(reopened.current.allTodos.length).toBe(2);
      const created = reopened.current.allTodos.find(t => t.sourceId === id);
      expect(created).toBeDefined();
      expect(created!.completed).toBe(false);
      expect(created!.dueDate).toBe('2026-07-03');

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
});
