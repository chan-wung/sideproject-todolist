import { describe, it, expect } from 'vitest';
import { todoToText, memoToText, copyFeedback, shareFeedback, kakaoFeedback } from './share';
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

describe('feedback messages', () => {
  it('copyFeedback: 성공이면 전달한 문구, 실패면 공통 실패 문구', () => {
    expect(copyFeedback(true, '복사했습니다.')).toEqual({ message: '복사했습니다.', type: 'success' });
    expect(copyFeedback(false, '복사했습니다.')).toEqual({ message: '복사에 실패했습니다.', type: 'danger' });
  });

  it('shareFeedback: 공유 완료·취소는 안내 없음', () => {
    expect(shareFeedback('shared')).toBeNull();
    expect(shareFeedback('canceled')).toBeNull();
  });

  it('shareFeedback: 클립보드 폴백은 primary, 실패는 danger', () => {
    expect(shareFeedback('copied')?.type).toBe('primary');
    expect(shareFeedback('failed')).toEqual({ message: '공유에 실패했습니다.', type: 'danger' });
  });

  it('kakaoFeedback: 성공이면 null, 실패면 danger', () => {
    expect(kakaoFeedback(true)).toBeNull();
    expect(kakaoFeedback(false)?.type).toBe('danger');
  });
});
