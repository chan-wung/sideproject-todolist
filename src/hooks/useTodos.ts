import { useState, useEffect } from 'react';
import type { Todo, FilterStatus, SortKey } from '../types/todo';

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
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('default');

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

  const categories = ['all', ...Array.from(new Set(todos.map(t => t.category)))];

  const filteredTodos = todos
    .filter(t => {
      const statusMatch =
        filterStatus === 'all' ||
        (filterStatus === 'active' && !t.completed) ||
        (filterStatus === 'completed' && t.completed);
      const categoryMatch = filterCategory === 'all' || t.category === filterCategory;
      return statusMatch && categoryMatch;
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

  return {
    filteredTodos,
    filterStatus,
    setFilterStatus,
    filterCategory,
    setFilterCategory,
    sortKey,
    setSortKey,
    categories,
    activeCount,
    completedCount,
    addTodo,
    toggleTodo,
    deleteTodo,
    updateTodo,
    clearCompleted,
  };
}
