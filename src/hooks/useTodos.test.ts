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

    it('toggleTodo clones recurring tasks', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-07-02T10:00:00'));

      const { result } = renderHook(() => useTodos());
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

      expect(result.current.allTodos.length).toBe(2);
      expect(result.current.allTodos[0].text).toBe('recurring');
      expect(result.current.allTodos[0].completed).toBe(false);
      expect(result.current.allTodos[0].dueDate).toBe('2026-07-03');
      expect(result.current.allTodos[1].id).toBe(oldId);
      expect(result.current.allTodos[1].completed).toBe(true);

      // 해제
      act(() => {
        result.current.toggleTodo(oldId);
      });
      expect(result.current.allTodos.length).toBe(2);
      expect(result.current.allTodos[1].completed).toBe(false);

      // 재완료
      act(() => {
        result.current.toggleTodo(oldId);
      });
      // 중복 생성 방지 확인 (파생 항목이 1개만 존재해야 함)
      expect(result.current.allTodos.length).toBe(2);
      expect(result.current.allTodos[1].completed).toBe(true);

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

  describe('localStorage migration', () => {
    it('migrates raw stored data on init', () => {
      localStorage.setItem('todolist-items', JSON.stringify([{ id: '1', text: 't', memoId: 'memo-a' }]));
      const { result } = renderHook(() => useTodos());
      expect(result.current.allTodos[0].memoIds).toEqual(['memo-a']);
    });
  });
});
