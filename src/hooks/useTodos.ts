import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Todo, FilterStatus, SortKey, DueScope } from '../types/todo';
import { usePersistentState } from './usePersistentState';
import { isToday, isThisWeek, isOverdue, calculateNextRecurrence, todayStr } from '../utils/date';
import { generateId } from '../utils/id';

const PRIORITY_ORDER: Record<Todo['priority'], number> = { high: 0, medium: 1, low: 2 };

const STORAGE_KEY = 'todolist-items';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function migrateTodo(raw: any): Todo {
  const { memoId, ...rest } = raw;
  if (Array.isArray(rest.memoIds)) {
    return rest as Todo; // 이미 신규 포맷 — 그대로 통과 (idempotent)
  }
  if (typeof memoId === 'string' && memoId) {
    return { ...rest, memoIds: [memoId] } as Todo;
  }
  return rest as Todo;
}

function loadFromStorage(): Todo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return validateTodos(parsed) || [];
  } catch {
    return [];
  }
}

export function validateTodos(incoming: unknown): Todo[] | null {
  if (!Array.isArray(incoming)) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ok = incoming.every((o: any) => o && typeof o.id === 'string' && typeof o.text === 'string');
  if (!ok) return null;
  
  return incoming.map(o => {
    const migrated = migrateTodo(o);
    const priority = ['low', 'medium', 'high'].includes(migrated.priority) ? migrated.priority : 'medium';
    const completed = typeof migrated.completed === 'boolean' ? migrated.completed : false;
    const category = typeof migrated.category === 'string' ? migrated.category : '기본';
    const createdAt = typeof migrated.createdAt === 'string' ? migrated.createdAt : new Date().toISOString();
    
    let subtasks = migrated.subtasks;
    if (Array.isArray(subtasks)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      subtasks = subtasks.filter((s: any) => s && typeof s.id === 'string' && typeof s.text === 'string');
    } else {
      subtasks = undefined;
    }

    let memoIds = migrated.memoIds;
    if (Array.isArray(memoIds)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      memoIds = memoIds.filter((m: any) => typeof m === 'string');
    } else {
      memoIds = undefined;
    }

    return {
      ...migrated,
      priority,
      completed,
      category,
      createdAt,
      subtasks,
      memoIds
    } as Todo;
  });
}

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>(loadFromStorage);
  const [filterStatus, setFilterStatus] = usePersistentState<FilterStatus>('todolist-pref-status', 'active');
  const [filterCategory, setFilterCategory] = usePersistentState<string>('todolist-pref-category', 'all');
  const [sortKey, setSortKey] = usePersistentState<SortKey>('todolist-pref-sort', 'default');
  const [query, setQuery] = usePersistentState<string>('todolist-pref-query', '');
  const [dueScope, setDueScope] = usePersistentState<DueScope>('todolist-pref-due', 'all');
  const [recurrenceOnly, setRecurrenceOnly] = usePersistentState<boolean>('todolist-pref-recurrence-only', false);
  const [undoInfo, setUndoInfo] = useState<{ message: string } | null>(null);
  const undoSnapshotRef = useRef<Todo[] | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch (e) {
      console.warn('localStorage write failed:', e);
    }
  }, [todos]);

  function withUndo(message: string, mutate: (prev: Todo[]) => Todo[]) {
    setTodos(prev => {
      undoSnapshotRef.current = prev;
      return mutate(prev);
    });
    setUndoInfo({ message });
  }

  const performUndo = useCallback(() => {
    setUndoInfo(current => {
      if (current && undoSnapshotRef.current) setTodos(undoSnapshotRef.current);
      return null;
    });
  }, []);

  const dismissUndo = useCallback(() => {
    setUndoInfo(null);
  }, []);

  function addTodo(
    text: string,
    priority: Todo['priority'],
    dueDate: string,
    category: string,
    recurrence: Todo['recurrence'] = 'none'
  ) {
    if (!text.trim()) return;
    const next: Todo = {
      id: generateId(),
      text: text.trim(),
      completed: false,
      priority,
      dueDate: dueDate || undefined,
      category: category.trim() || '기본',
      createdAt: new Date().toISOString(),
      recurrence: recurrence !== 'none' ? recurrence : undefined,
    };
    setTodos(prev => [next, ...prev]);
  }

  // 완료된 반복 할 일의 다음 회차를, 실제로 그 날짜가 되었을 때만 생성한다.
  // (완료 즉시 만들지 않음 — 매일이면 다음날, 매주면 다음주, 매달이면 다음달이 되어야 목록에 나타남)
  // 체크박스 직접 완료(toggleTodo)·하위 항목 전체 완료(toggleSubtask)·앱 재실행 시 점검 3곳에서 공유.
  function tryCreateRecurrenceChild(t: Todo, prev: Todo[]): Todo | null {
    if (!t.completed || !t.recurrence || t.recurrence === 'none' || t.recurrenceGenerated) return null;
    const nextDueDate = calculateNextRecurrence(t.dueDate, t.recurrence);
    if (!nextDueDate || nextDueDate > todayStr()) return null; // 아직 다음 회차 날짜가 되지 않음
    const alreadyExists = prev.some(pt => pt.sourceId === t.id);
    if (alreadyExists) return null;
    return {
      ...t,
      id: generateId(),
      completed: false,
      dueDate: nextDueDate,
      createdAt: new Date().toISOString(),
      subtasks: t.subtasks?.map(s => ({ ...s, id: generateId(), completed: false })),
      sourceId: t.id,
      recurrenceGenerated: false,
    };
  }

  // 앱을 열어둔 사이가 아니라 며칠 뒤 다시 열었을 때도, 그 사이 지난 회차를 반영한다.
  useEffect(() => {
    setTodos(prev => {
      const created: Todo[] = [];
      const next = prev.map(t => {
        const child = tryCreateRecurrenceChild(t, prev);
        if (!child) return t;
        created.push(child);
        return { ...t, recurrenceGenerated: true };
      });
      return created.length > 0 ? [...created, ...next] : prev;
    });
  }, []); // 마운트 시 1회 — 앱을 다시 열 때마다 지난 회차를 점검

  function toggleTodo(id: string) {
    setTodos(prev => {
      let newlyCreated: Todo | null = null;
      const nextList = prev.map(t => {
        if (t.id === id) {
          const newCompleted = !t.completed;
          const updated = {
            ...t,
            completed: newCompleted,
            subtasks: t.subtasks?.map(s => ({ ...s, completed: newCompleted })),
            recurrenceGenerated: newCompleted ? t.recurrenceGenerated : false,
          };
          const child = tryCreateRecurrenceChild(updated, prev);
          if (child) {
            newlyCreated = child;
            updated.recurrenceGenerated = true;
          }
          return updated;
        }
        return t;
      });
      if (newlyCreated) return [newlyCreated, ...nextList];
      return nextList;
    });
  }

  function deleteTodo(id: string) {
    withUndo('할 일을 삭제했습니다.', prev => prev.filter(t => t.id !== id));
  }

  function updateTodo(id: string, updates: Partial<Pick<Todo, 'text' | 'priority' | 'dueDate' | 'category' | 'recurrence' | 'memoIds'>>) {
    setTodos(prev =>
      prev.map(t => t.id === id ? { ...t, ...updates, dueDate: updates.dueDate || undefined } : t)
    );
  }

  function clearCompleted() {
    const count = todos.filter(t => t.completed).length;
    if (count === 0) return;
    withUndo(`완료된 항목 ${count}개를 삭제했습니다.`, prev => prev.filter(t => !t.completed));
  }

  function addSubtask(todoId: string, text: string) {
    if (!text.trim()) return;
    setTodos(prev => prev.map(t => t.id === todoId
      ? { ...t, subtasks: [...(t.subtasks ?? []), { id: generateId(), text: text.trim(), completed: false }], subtasksCollapsed: false }
      : t));
  }

  function linkMemoToTodo(todoId: string, memoId: string) {
    setTodos(prev => prev.map(t => {
      if (t.id !== todoId) return t;
      if ((t.memoIds ?? []).includes(memoId)) return t; // 중복 방지
      return { ...t, memoIds: [...(t.memoIds ?? []), memoId] };
    }));
  }

  function unlinkMemoFromTodo(todoId: string, memoId: string) {
    setTodos(prev => prev.map(t => {
      if (t.id !== todoId) return t;
      const filtered = (t.memoIds ?? []).filter(id => id !== memoId);
      return { ...t, memoIds: filtered.length > 0 ? filtered : undefined };
    }));
  }

  // Toggle collapsed state for a specific Todo's subtasks
  function toggleSubtasksCollapsed(todoId: string) {
    setTodos(prev => prev.map(t =>
      t.id === todoId ? { ...t, subtasksCollapsed: !t.subtasksCollapsed } : t
    ));
  }

  // Collapse all subtasks for todos that have subtasks
  function collapseAllSubtasks() {
    setTodos(prev => prev.map(t =>
      (t.subtasks && t.subtasks.length > 0) ? { ...t, subtasksCollapsed: true } : t
    ));
  }

  // Expand all subtasks for todos that have subtasks
  function expandAllSubtasks() {
    setTodos(prev => prev.map(t =>
      (t.subtasks && t.subtasks.length > 0) ? { ...t, subtasksCollapsed: false } : t
    ));
  }



  function toggleSubtask(todoId: string, subId: string) {
    setTodos(prev => {
      let newlyCreated: Todo | null = null;
      const nextList = prev.map(t => {
        if (t.id === todoId) {
          const newSubtasks = (t.subtasks ?? []).map(s =>
            s.id === subId ? { ...s, completed: !s.completed } : s
          );
          const allCompleted = newSubtasks.length > 0 && newSubtasks.every(s => s.completed);
          const updated = {
            ...t,
            subtasks: newSubtasks,
            completed: allCompleted,
            recurrenceGenerated: allCompleted ? t.recurrenceGenerated : false,
          };
          const child = tryCreateRecurrenceChild(updated, prev);
          if (child) {
            newlyCreated = child;
            updated.recurrenceGenerated = true;
          }
          return updated;
        }
        return t;
      });
      if (newlyCreated) return [newlyCreated, ...nextList];
      return nextList;
    });
  }

  function deleteSubtask(todoId: string, subId: string) {
    withUndo('하위 항목을 삭제했습니다.', prev => prev.map(t => {
      if (t.id === todoId) {
        const newSubtasks = (t.subtasks ?? []).filter(s => s.id !== subId);
        const allCompleted = newSubtasks.length > 0 ? newSubtasks.every(s => s.completed) : false;
        return { ...t, subtasks: newSubtasks, completed: allCompleted };
      }
      return t;
    }));
  }

  function updateSubtask(todoId: string, subId: string, text: string) {
    if (!text.trim()) return;
    setTodos(prev => prev.map(t =>
      t.id !== todoId ? t : {
        ...t,
        subtasks: (t.subtasks ?? []).map(s => s.id === subId ? { ...s, text: text.trim() } : s),
      }
    ));
  }

  function reorderSubtasks(todoId: string, fromIndex: number, toIndex: number) {
    setTodos(prev => prev.map(t => {
      if (t.id !== todoId) return t;
      const subtasks = [...(t.subtasks ?? [])];
      const [removed] = subtasks.splice(fromIndex, 1);
      subtasks.splice(toIndex, 0, removed);
      return { ...t, subtasks };
    }));
  }

  function resetTodos() { setTodos([]); }

  function exportData(): Todo[] { return todos; }

  function importData(validTodos: Todo[]): boolean {
    setTodos(validTodos);
    return true;
  }

  const categories = useMemo(() => {
    return ['all', ...Array.from(new Set(todos.map(t => t.category)))];
  }, [todos]);

  useEffect(() => {
    if (filterCategory !== 'all' && !categories.includes(filterCategory)) {
      setFilterCategory('all');
    }
  }, [categories, filterCategory, setFilterCategory]);

  const filteredTodos = todos
    .filter(t => {
      const statusMatch =
        filterStatus === 'all' ||
        (filterStatus === 'active' && !t.completed) ||
        (filterStatus === 'completed' && t.completed);
      const categoryMatch = filterCategory === 'all' || t.category === filterCategory;
      
      const q = query.trim().toLowerCase();
      const queryMatch = !q || t.text.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
      
      const dueMatch =
        dueScope === 'all' ||
        (dueScope === 'today' && isToday(t.dueDate)) ||
        (dueScope === 'week' && isThisWeek(t.dueDate)) ||
        (dueScope === 'overdue' && !t.completed && isOverdue(t.dueDate));

      const recurrenceMatch = !recurrenceOnly || (!!t.recurrence && t.recurrence !== 'none');

      return statusMatch && categoryMatch && queryMatch && dueMatch && recurrenceMatch;
    })
    .sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;

      if (sortKey === 'manual') {
        return 0;
      }
      if (sortKey === 'priority') {
        return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
      }
      if (sortKey === 'dueDate') {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

  const activeCount = todos.filter(t => !t.completed).length;
  const completedCount = todos.filter(t => t.completed).length;
  const dueTodayCount = todos.filter(t => !t.completed && isToday(t.dueDate)).length;
  const overdueCount = todos.filter(t => !t.completed && isOverdue(t.dueDate)).length;

  function pinTodo(id: string) {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, pinned: !t.pinned } : t));
  }

  function reorderTodos(draggedId: string, targetId: string) {
    if (draggedId === targetId) return;
    setTodos(prev => {
      const fromIndex = prev.findIndex(t => t.id === draggedId);
      const toIndex = prev.findIndex(t => t.id === targetId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  function bulkUpdateCategory(ids: string[], category: string) {
    const trimmed = category.trim();
    if (!trimmed || ids.length === 0) return;
    const idSet = new Set(ids);
    setTodos(prev => prev.map(t => idSet.has(t.id) ? { ...t, category: trimmed } : t));
  }

  function bulkUpdatePriority(ids: string[], priority: Todo['priority']) {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    setTodos(prev => prev.map(t => idSet.has(t.id) ? { ...t, priority } : t));
  }

  function bulkDelete(ids: string[]) {
    if (ids.length === 0) return;
    const idSet = new Set(ids);
    withUndo(`선택한 항목 ${ids.length}개를 삭제했습니다.`, prev => prev.filter(t => !idSet.has(t.id)));
  }

  const pruneMemoLinks = useCallback((validMemoIds: string[]) => {
    const validSet = new Set(validMemoIds);
    setTodos(prev => {
      let changed = false;
      const next = prev.map(t => {
        if (!t.memoIds || t.memoIds.length === 0) return t;
        const filtered = t.memoIds.filter(id => validSet.has(id));
        if (filtered.length === t.memoIds.length) return t;
        changed = true;
        return { ...t, memoIds: filtered.length > 0 ? filtered : undefined };
      });
      return changed ? next : prev;
    });
  }, []);

  return {
    allTodos: todos,
    filteredTodos,
    filterStatus,
    setFilterStatus,
    filterCategory,
    setFilterCategory,
    sortKey,
    setSortKey,
    query,
    setQuery,
    dueScope,
    setDueScope,
    recurrenceOnly,
    setRecurrenceOnly,
    categories,
    activeCount,
    completedCount,
    dueTodayCount,
    overdueCount,
    addTodo,
    toggleTodo,
    deleteTodo,
    updateTodo,
    pinTodo,
    reorderTodos,
    bulkUpdateCategory,
    bulkUpdatePriority,
    bulkDelete,
    pruneMemoLinks,
    clearCompleted,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    updateSubtask,
    reorderSubtasks,
    resetTodos,
    exportData,
    importData,
    undoMessage: undoInfo?.message ?? null,
    performUndo,
    dismissUndo,
    linkMemoToTodo,
    unlinkMemoFromTodo,
    // New collapsible subtask handlers
    toggleSubtasksCollapsed,
    collapseAllSubtasks,
    expandAllSubtasks,
  };


}
