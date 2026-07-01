export interface Subtask { id: string; text: string; completed: boolean; }

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  category: string;
  createdAt: string;
  subtasks?: Subtask[];
  pinned?: boolean;
  recurrence?: 'none' | 'daily' | 'weekly' | 'monthly';
}

export type FilterStatus = 'all' | 'active' | 'completed';
export type SortKey = 'default' | 'priority' | 'dueDate' | 'manual';
export type DueScope = 'all' | 'today' | 'week' | 'overdue';
