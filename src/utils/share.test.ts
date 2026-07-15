import { describe, it, expect } from 'vitest';
import { todoToText, memoToText } from './share';
import type { Todo } from '../types/todo';

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: '1',
    text: '장보기',
    completed: false,
    priority: 'medium',
    category: '기본',
    createdAt: '2026-07-01T09:00:00',
    ...overrides,
  };
}

describe('todoToText', () => {
  it('formats an active todo as plain title only', () => {
    expect(todoToText(makeTodo())).toBe('장보기');
  });

  it('marks completed items with ✔ and lists subtasks as bullets', () => {
    const todo = makeTodo({
      completed: true,
      subtasks: [
        { id: 's1', text: '우유', completed: true },
        { id: 's2', text: '계란', completed: false },
      ],
    });
    expect(todoToText(todo)).toBe('장보기 ✔\n- 우유 ✔\n- 계란');
  });

  it('does not include category or due date', () => {
    const todo = makeTodo({ category: '업무', dueDate: '2026-07-20' });
    expect(todoToText(todo)).toBe('장보기');
  });
});

describe('memoToText', () => {
  it('joins title and content with a blank line', () => {
    expect(memoToText({ id: 'm', title: '회의록', content: '내용입니다.' })).toBe('회의록\n\n내용입니다.');
  });

  it('returns only content when title is empty', () => {
    expect(memoToText({ id: 'm', title: '  ', content: '내용' })).toBe('내용');
  });

  it('returns only title when content is empty', () => {
    expect(memoToText({ id: 'm', title: '제목', content: '' })).toBe('제목');
  });
});
