import { useState, useEffect } from 'react';
import type { Todo, FilterStatus, SortKey, DueScope } from '../types/todo';
import { usePersistentState } from './usePersistentState';
import { isToday, isThisWeek, isOverdue } from '../utils/date';

const PRIORITY_ORDER: Record<Todo['priority'], number> = { high: 0, medium: 1, low: 2 };

const STORAGE_KEY = 'todolist-items';

function loadFromStorage(): Todo[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function useTodos() {
  const [todos, setTodos] = useState<Todo[]>(loadFromStorage);
  const [filterStatus, setFilterStatus] = usePersistentState<FilterStatus>('todolist-pref-status', 'all');
  const [filterCategory, setFilterCategory] = usePersistentState<string>('todolist-pref-category', 'all');
  const [sortKey, setSortKey] = usePersistentState<SortKey>('todolist-pref-sort', 'default');
  const [query, setQuery] = usePersistentState<string>('todolist-pref-query', '');
  const [dueScope, setDueScope] = usePersistentState<DueScope>('todolist-pref-due', 'all');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  }, [todos]);

  function addTodo(
    text: string,
    priority: Todo['priority'],
    dueDate: string,
    category: string
  ) {
    if (!text.trim()) return;
    const next: Todo = {
      id: crypto.randomUUID(),
      text: text.trim(),
      completed: false,
      priority,
      dueDate: dueDate || undefined,
      category: category.trim() || '기본',
      createdAt: new Date().toISOString(),
    };
    setTodos(prev => [next, ...prev]);
  }

  function toggleTodo(id: string) {
    setTodos(prev =>
      prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t)
    );
  }

  function deleteTodo(id: string) {
    setTodos(prev => prev.filter(t => t.id !== id));
  }

  function updateTodo(id: string, updates: Partial<Pick<Todo, 'text' | 'priority' | 'dueDate' | 'category'>>) {
    setTodos(prev =>
      prev.map(t => t.id === id ? { ...t, ...updates, dueDate: updates.dueDate || undefined } : t)
    );
  }

  function clearCompleted() {
    setTodos(prev => prev.filter(t => !t.completed));
  }

  function addSubtask(todoId: string, text: string) {
    if (!text.trim()) return;
    setTodos(prev => prev.map(t => t.id === todoId
      ? { ...t, subtasks: [...(t.subtasks ?? []), { id: crypto.randomUUID(), text: text.trim(), completed: false }] } : t));
  }

  function toggleSubtask(todoId: string, subId: string) {
    setTodos(prev => prev.map(t => t.id === todoId
      ? { ...t, subtasks: (t.subtasks ?? []).map(s => s.id === subId ? { ...s, completed: !s.completed } : s) } : t));
  }

  function deleteSubtask(todoId: string, subId: string) {
    setTodos(prev => prev.map(t => t.id === todoId
      ? { ...t, subtasks: (t.subtasks ?? []).filter(s => s.id !== subId) } : t));
  }

  function exportData(): Todo[] { return todos; }

  function importData(incoming: unknown): boolean {
    if (!Array.isArray(incoming)) return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ok = incoming.every((o: any) => o && typeof o.id === 'string' && typeof o.text === 'string');
    if (!ok) return false;
    setTodos(incoming as Todo[]);
    return true;
  }

  const categories = ['all', ...Array.from(new Set(todos.map(t => t.category)))];

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
        
      return statusMatch && categoryMatch && queryMatch && dueMatch;
    })
    .sort((a, b) => {
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

  return {
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
    categories,
    activeCount,
    completedCount,
    dueTodayCount,
    overdueCount,
    addTodo,
    toggleTodo,
    deleteTodo,
    updateTodo,
    clearCompleted,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    exportData,
    importData,
  };
}
