import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { Todo, Subtask, FilterStatus, SortKey, DueScope, CompletionLogEntry, RecurrenceSeries, RecurrenceFrequency, TodoKind, TodoUpdates } from '../types/todo';
import { usePersistentState, oneOf } from './usePersistentState';
import { isToday, isOverdue, todayStr } from '../utils/date';
import { migrateLegacyRecurrence, materializeDueOccurrences } from '../utils/recurrence';
import { generateId } from '../utils/id';
import { normalizeKind } from '../utils/kind';
import { moveItem } from '../utils/list';
import { readStorage, writeStorage } from '../utils/storage';
import { validateTodos, validateCompletionLog, toCompletionLogEntry } from '../utils/todoData';
import { filterTodos, sortTodos } from '../utils/todoFilter';
import { withValidMemoLinks } from '../utils/todoOps';
import { completePastLeaves } from '../utils/leave';
import { useRecurrenceSeries } from './useRecurrenceSeries';
import { useDayChange } from './useDayChange';

const STORAGE_KEY = 'todolist-items';

// 실행취소에 필요한 최소 정보. 지운 것과 그 위치만 기억한다.
type UndoAction =
  | { kind: 'todos'; removed: { todo: Todo; index: number; afterId: string | null }[]; logEntries: CompletionLogEntry[] }
  | { kind: 'subtask'; todoId: string; subtask: Subtask; index: number; before: Pick<Todo, 'completed' | 'completedAt'>; afterCompleted: boolean };

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
    importRecurrenceSeries: importSeriesRaw,
  } = useRecurrenceSeries(todosRef, setTodos);
  // 가져오기·시작 시 구형 반복 이행과 도래 회차 생성, 지난 연차 완료를 다시 돌리라는 신호
  const [reconcileTick, setReconcileTick] = useState(0);
  // 휴지통에 없는(지워진) 메모를 가리키는 연결을 되살리지 않기 위해 마지막으로 확인한 메모 id를 기억한다
  const validMemoIdsRef = useRef<Set<string> | null>(null);
  const [filterStatus, setFilterStatus] = usePersistentState<FilterStatus>('todolist-pref-status', 'active', oneOf('all', 'active', 'completed'));
  const [filterCategory, setFilterCategory] = usePersistentState<string>('todolist-pref-category', 'all');
  const [sortKey, setSortKey] = usePersistentState<SortKey>('todolist-pref-sort', 'default', oneOf('default', 'priority', 'dueDate', 'manual'));
  const [query, setQuery] = usePersistentState<string>('todolist-pref-query', '');
  const [dueScope, setDueScope] = usePersistentState<DueScope>('todolist-pref-due', 'all', oneOf('all', 'today', 'week', 'overdue'));
  const [recurrenceOnly, setRecurrenceOnly] = usePersistentState<boolean>('todolist-pref-recurrence-only', false);
  const [completionLog, setCompletionLog] = usePersistentState<CompletionLogEntry[]>('todolist-completion-log', [], validateCompletionLog);
  // 실행취소는 "방금 한 삭제"만 되돌린다. 전체 스냅샷을 복원하면 그 뒤에 한 추가·수정까지 같이 사라진다.
  const [undoInfo, setUndoInfo] = useState<{ message: string; id: number } | null>(null);
  const undoActionRef = useRef<UndoAction | null>(null);
  const undoSeqRef = useRef(0);

  useEffect(() => { writeStorage(STORAGE_KEY, todos); }, [todos]);

  // 같은 안내 문구로 연속 삭제해도 새 실행취소로 인식되도록 번호(id)를 매번 올린다.
  function registerUndo(message: string, action: UndoAction) {
    undoActionRef.current = action;
    undoSeqRef.current += 1;
    setUndoInfo({ message, id: undoSeqRef.current });
  }

  // 지울 할 일들을 원래 위치와 함께 기억해 두고 지운다. 완료 상태였던 항목은 완료 이력에도 남긴다.
  function removeTodos(message: string, ids: Set<string>) {
    const current = todosRef.current;
    const removed = current
      .map((todo, index) => ({ todo, index, afterId: index > 0 ? current[index - 1].id : null }))
      .filter(r => ids.has(r.todo.id));
    if (removed.length === 0) return;
    const logEntries = removed.filter(r => r.todo.completed).map(r => toCompletionLogEntry(r.todo));
    if (logEntries.length > 0) setCompletionLog(prev => [...logEntries, ...prev]);
    setTodos(prev => prev.filter(t => !ids.has(t.id)));
    registerUndo(message, { kind: 'todos', removed, logEntries });
  }

  const performUndo = useCallback(() => {
    const action = undoActionRef.current;
    undoActionRef.current = null;
    setUndoInfo(null);
    if (!action) return;
    if (action.kind === 'todos') {
      const { removed, logEntries } = action;
      setTodos(prev => {
        const next = [...prev];
        for (const r of removed) { // 원래 순서대로 넣어야 앞 항목이 먼저 자리를 잡는다
          if (next.some(t => t.id === r.todo.id)) continue;
          const todo = withValidMemoLinks(r.todo, validMemoIdsRef.current);
          const after = r.afterId === null ? -1 : next.findIndex(t => t.id === r.afterId);
          const at = r.afterId === null ? 0 : after === -1 ? Math.min(r.index, next.length) : after + 1;
          next.splice(at, 0, todo);
        }
        return next;
      });
      if (logEntries.length > 0) {
        const added = new Set(logEntries);
        setCompletionLog(prev => prev.filter(e => !added.has(e)));
      }
    } else {
      const { todoId, subtask, index, before, afterCompleted } = action;
      setTodos(prev => prev.map(t => {
        if (t.id !== todoId || (t.subtasks ?? []).some(s => s.id === subtask.id)) return t;
        const subtasks = [...(t.subtasks ?? [])];
        subtasks.splice(Math.min(index, subtasks.length), 0, subtask);
        // 삭제 직후의 완료 상태 그대로일 때만 삭제 전 상태로 돌린다 (그 사이 사용자가 바꿨다면 존중)
        return t.completed === afterCompleted ? { ...t, subtasks, completed: before.completed, completedAt: before.completedAt } : { ...t, subtasks };
      }));
    }
  }, [setCompletionLog]);

  const dismissUndo = useCallback(() => {
    undoActionRef.current = null;
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

    // 연차·휴가는 하루짜리이고 반복할 수 없다 (입력창이 숨겨 주더라도 여기서도 지킨다)
    const isLeave = normalizeKind(kind) === 'leave';

    // 반복 주기를 고르면 개별 할 일이 아니라 '반복 시리즈'를 만든다.
    if (!isLeave && recurrence && recurrence !== 'none') {
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
      startDate: !isLeave && startDate && dueDate && startDate < dueDate ? startDate : undefined,
      dueDate: dueDate || undefined,
      category: cat,
      createdAt: new Date().toISOString(),
      kind,
    };
    setTodos(prev => [next, ...prev]);
    if (isLeave) completeLeaves(); // 이미 지난 날짜의 연차를 등록했다면 바로 완료 처리
  }

  // 앱 실행 시, 그리고 백업을 가져온 직후: 레거시 반복 데이터를 시리즈로 전환하고, 도래한 회차를 생성하고, 지난 연차를 완료한다.
  const handledTick = useRef(-1);
  useEffect(() => {
    if (handledTick.current === reconcileTick) return; // StrictMode의 이중 실행 방지
    handledTick.current = reconcileTick;
    const today = todayStr();
    const migrated = migrateLegacyRecurrence(todos, recurrenceSeries);
    const { newTodos, nextSeries, changed } = materializeDueOccurrences(migrated.series, migrated.todos, today);
    if (migrated.changed || newTodos.length > 0) {
      setTodos(newTodos.length > 0 ? [...newTodos, ...migrated.todos] : migrated.todos);
    }
    if (migrated.changed || changed) {
      setRecurrenceSeries(nextSeries);
    }
    setTodos(prev => completePastLeaves(prev, today));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reconcileTick]);

  // 날짜가 지난 연차·휴가는 직접 체크하지 않아도 완료로 바꾼다. 앱을 열 때, 그리고 날짜가 바뀌거나 탭이 다시 보일 때 확인한다.
  const completeLeaves = useCallback(() => setTodos(prev => completePastLeaves(prev, todayStr())), []);
  useEffect(completeLeaves, [completeLeaves]);
  useDayChange(completeLeaves);

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
    removeTodos('할 일을 삭제했습니다.', new Set([id]));
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
    // 연차·휴가는 시작일(기간)·반복·메모 연결을 갖지 않는다. 종류를 연차로 바꿀 때 숨은 값도 함께 지운다.
    const target = todosRef.current.find(t => t.id === id);
    const isLeave = normalizeKind('kind' in rest ? rest.kind : target?.kind) === 'leave';
    if (isLeave) {
      rest.startDate = '';
      rest.memoIds = undefined;
    }
    // 날짜는 updates에 키가 있을 때만 바꾼다 (값이 비면 지움). 메모 연결처럼 일부만 고칠 때 기간이 날아가지 않게 한다.
    setTodos(prev =>
      prev.map(t => t.id === id ? {
        ...t,
        ...rest,
        startDate: 'startDate' in rest ? rest.startDate || undefined : t.startDate,
        dueDate: 'dueDate' in rest ? rest.dueDate || undefined : t.dueDate,
      } : t)
    );
    if (!isLeave && recurrence && recurrence !== 'none') {
      promoteTodoToSeries(id, recurrence, rest);
    }
    if (isLeave) completeLeaves();
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
    removeTodos(`완료된 항목 ${completed.length}개를 삭제했습니다.`, new Set(completed.map(t => t.id)));
  }

  function addSubtask(todoId: string, text: string) {
    if (!text.trim()) return;
    setTodos(prev => prev.map(t => t.id === todoId
      // 완료된 할 일에 미완료 하위 항목이 생기면 완료를 풀어 다시 진행 중으로 되돌린다
      ? { ...t, subtasks: [...(t.subtasks ?? []), { id: generateId(), text: text.trim(), completed: false }], subtasksCollapsed: false, completed: false, completedAt: undefined }
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
    const parent = todosRef.current.find(t => t.id === todoId);
    const index = parent?.subtasks?.findIndex(s => s.id === subId) ?? -1;
    if (!parent || index === -1) return;
    const subtask = parent.subtasks![index];
    const afterCompleted = parent.subtasks!.length > 1 && parent.subtasks!.filter(s => s.id !== subId).every(s => s.completed);
    setTodos(prev => prev.map(t => {
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
    registerUndo('하위 항목을 삭제했습니다.', {
      kind: 'subtask',
      todoId,
      subtask,
      index,
      before: { completed: parent.completed, completedAt: parent.completedAt },
      afterCompleted,
    });
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

  function resetTodos() { dismissUndo(); setTodos([]); setRecurrenceSeries([]); }

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

  function importRecurrenceSeries(valid: RecurrenceSeries[]): boolean {
    importSeriesRaw(valid);
    setReconcileTick(t => t + 1);
    return true;
  }

  function importData(validTodos: Todo[]): boolean {
    dismissUndo(); // 가져오기 전 데이터로 되돌아가지 않게 남은 실행취소를 버린다
    setTodos(validTodos);
    setReconcileTick(t => t + 1);
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
    removeTodos(`선택한 항목 ${ids.length}개를 삭제했습니다.`, new Set(ids));
  }

  // 없어진 메모를 가리키는 연결을 할 일과 반복 시리즈(앞으로 만들 회차가 이어받는 연결)에서 함께 지운다.
  const pruneMemoLinks = useCallback((validMemoIds: string[]) => {
    const validSet = new Set(validMemoIds);
    validMemoIdsRef.current = validSet;
    setTodos(prev => {
      let changed = false;
      const next = prev.map(t => {
        const pruned = withValidMemoLinks(t, validSet);
        if (pruned !== t) changed = true;
        return pruned;
      });
      return changed ? next : prev;
    });
    setRecurrenceSeries(prev => {
      let changed = false;
      const next = prev.map(s => {
        if (!s.memoIds || s.memoIds.length === 0) return s;
        const filtered = s.memoIds.filter(id => validSet.has(id));
        if (filtered.length === s.memoIds.length) return s;
        changed = true;
        return { ...s, memoIds: filtered.length > 0 ? filtered : undefined };
      });
      return changed ? next : prev;
    });
  }, [setRecurrenceSeries]);

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
    undoId: undoInfo?.id ?? null,
    performUndo,
    dismissUndo,
    linkMemoToTodo,
    unlinkMemoFromTodo,
    toggleSubtasksCollapsed,
    collapseAllSubtasks,
    expandAllSubtasks,
  };
}
