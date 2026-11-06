import type { Todo, TodoKind } from '../types/todo';
import type { LeaveInput } from './leave';

// 할 일 입력창에 쓰던 값 전체. 화면을 옮겨도 남도록 App이 들고 내려줄 수 있다.
export interface TodoDraft {
  text: string;
  priority: Todo['priority'];
  startDate: string;
  dueDate: string;
  category: string;
  recurrence: Todo['recurrence'];
  kind: TodoKind;
  leave: LeaveInput;
}

const EMPTY_LEAVE: LeaveInput = { type: 'annual', start: '', end: '', name: '', reason: '' };

export const EMPTY_TODO_DRAFT: TodoDraft = {
  text: '', priority: 'medium', startDate: '', dueDate: '', category: '', recurrence: 'none', kind: 'task', leave: EMPTY_LEAVE,
};
