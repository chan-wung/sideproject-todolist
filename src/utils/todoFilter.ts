// 할 일 목록의 필터와 정렬. 화면 상태(필터 값)를 받아 새 배열을 돌려주는 순수 함수.
import type { Todo, FilterStatus, SortKey, DueScope } from '../types/todo';
import { isToday, isThisWeek, isOverdue } from './date';

const PRIORITY_ORDER: Record<Todo['priority'], number> = { high: 0, medium: 1, low: 2 };

export interface TodoFilters {
  filterStatus: FilterStatus;
  filterCategory: string;
  query: string;
  dueScope: DueScope;
  recurrenceOnly: boolean;
}

export function filterTodos(todos: Todo[], { filterStatus, filterCategory, query, dueScope, recurrenceOnly }: TodoFilters): Todo[] {
  const q = query.trim().toLowerCase();
  return todos.filter(t => {
    const statusMatch =
      filterStatus === 'all' ||
      (filterStatus === 'active' && !t.completed) ||
      (filterStatus === 'completed' && t.completed);
    const categoryMatch = filterCategory === 'all' || t.category === filterCategory;
    const queryMatch = !q || t.text.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);

    const dueMatch =
      dueScope === 'all' ||
      (dueScope === 'today' && isToday(t.dueDate)) ||
      (dueScope === 'week' && isThisWeek(t.dueDate)) ||
      (dueScope === 'overdue' && !t.completed && isOverdue(t.dueDate));

    const recurrenceMatch = !recurrenceOnly || !!t.seriesId || (!!t.recurrence && t.recurrence !== 'none');

    return statusMatch && categoryMatch && queryMatch && dueMatch && recurrenceMatch;
  });
}

// 고정한 항목이 항상 맨 위. 'manual'은 저장된 순서를 그대로 둔다. 원본 배열은 바꾸지 않는다.
export function sortTodos(todos: Todo[], sortKey: SortKey): Todo[] {
  return [...todos].sort((a, b) => {
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
}
