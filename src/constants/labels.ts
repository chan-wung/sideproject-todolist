import type { Todo, RecurrenceFrequency } from '../types/todo';

export type Priority = Todo['priority'];

export const PRIORITY_LABEL: Record<Priority, string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
};

// 셀렉트·버튼 목록에 쓰는 표시 순서
export const PRIORITY_OPTIONS: Priority[] = ['high', 'medium', 'low'];

export const FREQUENCY_LABEL: Record<RecurrenceFrequency, string> = {
  daily: '매일',
  weekly: '매주',
  monthly: '매월',
};

export const FREQUENCY_OPTIONS: RecurrenceFrequency[] = ['daily', 'weekly', 'monthly'];
