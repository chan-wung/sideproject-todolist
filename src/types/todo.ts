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
  memoIds?: string[];
  subtasksCollapsed?: boolean; // 기본값 false (펼침). 하위 항목 없는 Todo는 의미 없음.
  sourceId?: string;
  recurrenceGenerated?: boolean; // 이 완료 건에 대해 다음 회차를 이미 생성했는지 여부 (재완료 시 초기화됨)
}

export type FilterStatus = 'all' | 'active' | 'completed';
export type SortKey = 'default' | 'priority' | 'dueDate' | 'manual';
export type DueScope = 'all' | 'today' | 'week' | 'overdue';
