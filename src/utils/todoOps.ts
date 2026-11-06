import type { Todo } from '../types/todo';

// 유효한 메모만 연결로 남긴다. 바꿀 게 없으면 받은 객체를 그대로 돌려준다.
export function withValidMemoLinks(todo: Todo, valid: Set<string> | null): Todo {
  if (!valid || !todo.memoIds || todo.memoIds.length === 0) return todo;
  const filtered = todo.memoIds.filter(id => valid.has(id));
  if (filtered.length === todo.memoIds.length) return todo;
  return { ...todo, memoIds: filtered.length > 0 ? filtered : undefined };
}
