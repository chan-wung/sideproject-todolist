import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Todo, FilterStatus, SortKey, DueScope, CompletionLogEntry, RecurrenceSeries, RecurrenceFrequency, TodoKind, TodoUpdates } from '../types/todo';
import { usePersistentState } from './usePersistentState';
import { isToday, isOverdue, todayStr } from '../utils/date';
import { migrateLegacyRecurrence, materializeDueOccurrences } from '../utils/recurrence';
import { generateId } from '../utils/id';
import { normalizeKind } from '../utils/kind';
import { moveItem } from '../utils/list';
import { readStorage, writeStorage } from '../utils/storage';
import { validateTodos, toCompletionLogEntry } from '../utils/todoData';
import { filterTodos, sortTodos } from '../utils/todoFilter';
import { useRecurrenceSeries } from './useRecurrenceSeries';

const STORAGE_KEY = 'todolist-items';

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>(() => readStorage(STORAGE_KEY, validateTodos, []));
  const todosRef = useRef(todos);
  todosRef.current = todos;
  const {
    recurrenceSeries,
    setRecurrenceSeries,
    addRecurrenceSeries,
    updateRecurrenceSeries,
    endRecurrenceSeries,
    resumeRecurrenceSeries,
    exportRecurrenceSeries,
    importRecurrenceSeries,
  } = useRecurrenceSeries(todosRef, setTodos);
  const [filterStatus, setFilterStatus] = usePersistentState<FilterStatus>('todolist-pref-status', 'active');
  const [filterCategory, setFilterCategory] = usePersistentState<string>('todolist-pref-category', 'all');
  const [sortKey, setSortKey] = usePersistentState<SortKey>('todolist-pref-sort', 'default');
  const [query, setQuery] = usePersistentState<string>('todolist-pref-query', '');
  const [dueScope, setDueScope] = usePersistentState<DueScope>('todolist-pref-due', 'all');
  const [recurrenceOnly, setRecurrenceOnly] = usePersistentState<boolean>('todolist-pref-recurrence-only', false);
  const [completionLog, setCompletionLog] = usePersistentState<CompletionLogEntry[]>('todolist-completion-log', []);
  const [undoInfo, setUndoInfo] = useState<{ message: string } | null>(null);
  const undoSnapshotRef = useRef<Todo[] | null>(null);
  const undoLogSnapshotRef = useRef<CompletionLogEntry[] | null>(null);

  useEffect(() => writeStorage(STORAGE_KEY, todos), [todos]);

  function withUndo(message: string, mutate: (prev: Todo[]) => Todo[]) {
    setTodos(prev => {
      undoSnapshotRef.current = prev;
      return mutate(prev);
    });
    setUndoInfo({ message });
  }

  // 완료 이력에 남길 항목을 기록한다. withUndo와 함께, 삭제되는 시점에 completed였던 항목만 남긴다.
  // withUndo를 호출하는 모든 삭제 액션은 (기록할 게 없어도) 이 함수를 먼저 호출해 실행취소 스냅샷을 최신 상태로 유지해야 한다.
  function logCompletedRemovals(removed: Todo[]) {
    const entries = removed.filter(t => t.completed).map(toCompletionLogEntry);
    if (entries.length === 0) {
      undoLogSnapshotRef.current = null;
      return;
    }
    undoLogSnapshotRef.current = completionLog;
    setCompletionLog(prev => [...entries, ...prev]);
  }

  const performUndo = useCallback(() => {
    setUndoInfo(current => {
      if (current) {
        if (undoSnapshotRef.current) setTodos(undoSnapshotRef.current);
        if (undoLogSnapshotRef.current !== null) {
          setCompletionLog(undoLogSnapshotRef.current);
          undoLogSnapshotRef.current = null;
        }
      }
      return null;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dismissUndo = useCallback(() => {
    setUndoInfo(null);
  }, []);

  function resetCompletionLog() {
    setCompletionLog([]);
  }

  // 잘못 기록된 이력 한 건만 지운다. 같은 id가 겹쳐 있을 수 있어 id와 완료 시각이 모두 같은 항목만 지운다.
  function deleteCompletionLogEntry(entry: Pick<CompletionLogEntry, 'id' | 'completedAt'>) {
    setCompletionLog(prev => prev.filter(e => !(e.id === entry.id && e.completedAt === entry.completedAt)));
  }

  function addTodo(
    text: string,
    priority: Todo['priority'],
    dueDate: string,
    category: string,
    recurrence: Todo['recurrence'] = 'none',
    kind: TodoKind = 'task',
    startDate = ''
  ) {
    if (!text.trim()) return;
    const trimmed = text.trim();
    const cat = category.trim() || '기본';

    // 반복 주기를 고르면 개별 할 일이 아니라 '반복 시리즈'를 만든다.
    if (recurrence && recurrence !== 'none') {
      addRecurrenceSeries({
        text: trimmed,
        category: cat,
        priority,
        frequency: recurrence,
        anchorDate: dueDate || todayStr(),
        kind,
      });
      return;
    }

    const next: Todo = {
      id: generateId(),
      text: trimmed,
      completed: false,
      priority,
      // 시작일은 마감일이 있고 그보다 앞설 때만 저장한다
      startDate: startDate && dueDate && startDate < dueDate ? startDate : undefined,
      dueDate: dueDate || undefined,
      category: cat,
      createdAt: new Date().toISOString(),
      kind,
    };
    setTodos(prev => [next, ...prev]);
  }

  // 앱 실행 시 1회: 레거시 반복 데이터를 시리즈로 전환하고, 도래한 회차를 생성한다.
  const didInitRecurrence = useRef(false);
  useEffect(() => {
    if (didInitRecurrence.current) return;
    didInitRecurrence.current = true;
    const today = todayStr();
    const migrated = migrateLegacyRecurrence(todos, recurrenceSeries);
    const { newTodos, nextSeries, changed } = materializeDueOccurrences(migrated.series, migrated.todos, today);
    if (migrated.changed || newTodos.length > 0) {
      setTodos(newTodos.length > 0 ? [...newTodos, ...migrated.todos] : migrated.todos);
    }
    if (migrated.changed || changed) {
      setRecurrenceSeries(nextSeries);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleTodo(id: string) {
    setTodos(prev => prev.map(t => {
      if (t.id !== id) return t;
      const newCompleted = !t.completed;
      return {
        ...t,
        completed: newCompleted,
        subtasks: t.subtasks?.map(s => ({ ...s, completed: newCompleted })),
        completedAt: newCompleted ? new Date().toISOString() : undefined,
      };
    }));
  }

  function deleteTodo(id: string) {
    const target = todos.find(t => t.id === id);
    logCompletedRemovals(target ? [target] : []);
    withUndo('할 일을 삭제했습니다.', prev => prev.filter(t => t.id !== id));
  }

  // 시리즈에 아직 속하지 않은 할 일에 반복 주기를 새로 지정하면, 그 할 일을 첫 회차로 삼아 시리즈로 승격한다.
  function promoteTodoToSeries(
    id: string,
    frequency: RecurrenceFrequency,
    patch: Partial<Pick<Todo, 'text' | 'priority' | 'dueDate' | 'category' | 'memoIds' | 'kind'>>
  ) {
    const target = todos.find(t => t.id === id);
    if (!target || target.seriesId) return;
    const merged = { ...target, ...patch };
    const anchorDate = (patch.dueDate ?? target.dueDate) || todayStr();
    const memoIds = patch.memoIds ?? merged.memoIds;
    const series: RecurrenceSeries = {
      id: generateId(),
      text: merged.text.trim() || merged.text,
      category: merged.category || '기본',
      priority: merged.priority,
      frequency,
      anchorDate,
      subtasksTemplate: merged.subtasks && merged.subtasks.length > 0 ? merged.subtasks.map(s => s.text) : undefined,
      memoIds: memoIds && memoIds.length > 0 ? [...memoIds] : undefined,
      kind: normalizeKind(merged.kind),
      status: 'active',
      lastMaterializedDate: anchorDate, // 이 할 일 자체가 첫 회차이므로 그 날짜까지는 채워진 것으로 본다
      createdAt: new Date().toISOString(),
    };
    setTodos(prev => prev.map(t => t.id === id ? { ...t, seriesId: series.id } : t));
    setRecurrenceSeries(prev => [...prev, series]);
  }

  function updateTodo(id: string, updates: TodoUpdates) {
    const { recurrence, ...rest } = updates;
    // 날짜는 updates에 키가 있을 때만 바꾼다 (값이 비면 지움). 메모 연결처럼 일부만 고칠 때 기간이 날아가지 않게 한다.
    setTodos(prev =>
      prev.map(t => t.id === id ? {
        ...t,
        ...rest,
        startDate: 'startDate' in rest ? rest.startDate || undefined : t.startDate,
        dueDate: 'dueDate' in rest ? rest.dueDate || undefined : t.dueDate,
      } : t)
    );
    if (recurrence && recurrence !== 'none') {
      promoteTodoToSeries(id, recurrence, rest);
    }
  }

  // 원본 바로 아래에 사본을 만든다. 템플릿처럼 다시 쓸 수 있도록 완료 상태는 초기화하고,
  // 고정·반복 생성 이력 등 원본 고유 상태는 이어받지 않는다.
  function duplicateTodo(id: string) {
    setTodos(prev => {
      const index = prev.findIndex(t => t.id === id);
      if (index === -1) return prev;
      const src = prev[index];
      const copy: Todo = {
        ...src,
        id: generateId(),
        text: `${src.text} (복사)`,
        completed: false,
        createdAt: new Date().toISOString(),
        subtasks: src.subtasks?.map(s => ({ ...s, id: generateId(), completed: false })),
        pinned: undefined,
        sourceId: undefined,
        recurrenceGenerated: undefined,
        seriesId: undefined, // 복사본은 독립된 일회성 할 일 (반복 시리즈에 묶지 않음)
        completedAt: undefined,
      };
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next;
    });
  }

  function clearCompleted() {
    const completed = todos.filter(t => t.completed);
    if (completed.length === 0) return;
    logCompletedRemovals(completed);
    withUndo(`완료된 항목 ${completed.length}개를 삭제했습니다.`, prev => prev.filter(t => !t.completed));
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

  // 특정 할 일의 하위 항목 접힘 상태를 토글
  function toggleSubtasksCollapsed(todoId: string) {
    setTodos(prev => prev.map(t =>
      t.id === todoId ? { ...t, subtasksCollapsed: !t.subtasksCollapsed } : t
    ));
  }

  // 하위 항목이 있는 모든 할 일의 접힘 상태를 한 번에 설정
  function setAllSubtasksCollapsed(collapsed: boolean) {
    setTodos(prev => prev.map(t =>
      (t.subtasks && t.subtasks.length > 0) ? { ...t, subtasksCollapsed: collapsed } : t
    ));
  }
  const collapseAllSubtasks = () => setAllSubtasksCollapsed(true);
  const expandAllSubtasks = () => setAllSubtasksCollapsed(false);

  function toggleSubtask(todoId: string, subId: string) {
    setTodos(prev => prev.map(t => {
      if (t.id !== todoId) return t;
      const newSubtasks = (t.subtasks ?? []).map(s =>
        s.id === subId ? { ...s, completed: !s.completed } : s
      );
      const allCompleted = newSubtasks.length > 0 && newSubtasks.every(s => s.completed);
      return {
        ...t,
        subtasks: newSubtasks,
        completed: allCompleted,
        completedAt: allCompleted ? new Date().toISOString() : undefined,
      };
    }));
  }

  function deleteSubtask(todoId: string, subId: string) {
    logCompletedRemovals([]);
    withUndo('하위 항목을 삭제했습니다.', prev => prev.map(t => {
      if (t.id === todoId) {
        const newSubtasks = (t.subtasks ?? []).filter(s => s.id !== subId);
        const allCompleted = newSubtasks.length > 0 ? newSubtasks.every(s => s.completed) : false;
        return {
          ...t,
          subtasks: newSubtasks,
          completed: allCompleted,
          completedAt: allCompleted ? (t.completed ? t.completedAt : new Date().toISOString()) : undefined,
        };
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
    setTodos(prev => prev.map(t =>
      t.id !== todoId ? t : { ...t, subtasks: moveItem(t.subtasks ?? [], fromIndex, toIndex) }
    ));
  }

  function resetTodos() { setTodos([]); setRecurrenceSeries([]); }

  // 시리즈 규칙을 삭제한다. 생성돼 있던 회차 Todo는 유지하되 시리즈 연결만 끊는다.
  function deleteRecurrenceSeries(id: string) {
    setRecurrenceSeries(prev => prev.filter(s => s.id !== id));
    setTodos(prev => prev.map(t => {
      if (t.seriesId !== id) return t;
      const rest = { ...t };
      delete rest.seriesId;
      return rest;
    }));
  }

  function exportData(): Todo[] { return todos; }

  function exportCompletionLog(): CompletionLogEntry[] { return completionLog; }

  function importCompletionLog(validEntries: CompletionLogEntry[]): boolean {
    setCompletionLog(validEntries);
    return true;
  }

  function importData(validTodos: Todo[]): boolean {
    setTodos(validTodos);
    return true;
  }

  const categories = useMemo(() => {
    return ['all', ...Array.from(new Set(todos.map(t => t.category)))];
  }, [todos]);

  // 'all' 없이 실제 프로젝트만 (입력창 자동완성·일괄 변경 등에서 사용)
  const categoryOptions = useMemo(() => categories.slice(1), [categories]);

  useEffect(() => {
    if (filterCategory !== 'all' && !categories.includes(filterCategory)) {
      setFilterCategory('all');
    }
  }, [categories, filterCategory, setFilterCategory]);

  const filteredTodos = sortTodos(
    filterTodos(todos, { filterStatus, filterCategory, query, dueScope, recurrenceOnly }),
    sortKey,
  );

  const activeCount = todos.filter(t => !t.completed).length;
  const completedCount = todos.filter(t => t.completed).length;
  const dueTodayCount = todos.filter(t => !t.completed && isToday(t.dueDate)).length;
  const overdueCount = todos.filter(t => !t.completed && isOverdue(t.dueDate)).length;

  function pinTodo(id: string) {
    setTodos(prev => prev.map(t => t.id === id ? { ...t, pinned: !t.pinned } : t));
  }

  function reorderTodos(draggedId: string, targetId: string) {
    if (draggedId === targetId) return;
    setTodos(prev => moveItem(
      prev,
      prev.findIndex(t => t.id === draggedId),
      prev.findIndex(t => t.id === targetId),
    ));
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
    logCompletedRemovals(todos.filter(t => idSet.has(t.id)));
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
    completionLog,
    resetCompletionLog,
    deleteCompletionLogEntry,
    exportCompletionLog,
    importCompletionLog,
    categories,
    categoryOptions,
    activeCount,
    completedCount,
    dueTodayCount,
    overdueCount,
    addTodo,
    toggleTodo,
    deleteTodo,
    duplicateTodo,
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
    recurrenceSeries,
    addRecurrenceSeries,
    updateRecurrenceSeries,
    endRecurrenceSeries,
    resumeRecurrenceSeries,
    deleteRecurrenceSeries,
    exportRecurrenceSeries,
    importRecurrenceSeries,
    undoMessage: undoInfo?.message ?? null,
    performUndo,
    dismissUndo,
    linkMemoToTodo,
    unlinkMemoFromTodo,
    toggleSubtasksCollapsed,
    collapseAllSubtasks,
    expandAllSubtasks,
  };
}
