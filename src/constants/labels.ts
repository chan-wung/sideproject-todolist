import type { Todo, RecurrenceFrequency, TodoKind } from '../types/todo';

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

export const KIND_LABEL: Record<TodoKind, string> = {
  task: '일반 업무',
  routine: '정기 업무',
  leave: '연차·휴가',
};

export const KIND_OPTIONS: TodoKind[] = ['task', 'routine', 'leave'];

// 캘린더에서 연차·휴가를 등록할 때 고르는 종류
export type LeaveType = 'annual' | 'am' | 'pm' | 'hourly' | 'custom';

export const LEAVE_TYPES: { id: LeaveType; label: string }[] = [
  { id: 'annual', label: '연차' },
  { id: 'am', label: '오전 반차' },
  { id: 'pm', label: '오후 반차' },
  { id: 'hourly', label: '시간 연차' },
  { id: 'custom', label: '기타' },
];

// 상단 메뉴(화면 전환). 주소의 해시(#/todos)와 1:1로 대응한다.
export type View = 'dashboard' | 'todos' | 'calendar' | 'memo' | 'report';

export const VIEW_LABEL: Record<View, string> = {
  dashboard: '대시보드',
  todos: '할 일',
  calendar: '캘린더',
  memo: '메모장',
  report: '주간보고',
};

export const VIEW_OPTIONS: View[] = ['dashboard', 'todos', 'calendar', 'memo', 'report'];
export const DEFAULT_VIEW: View = 'todos';
