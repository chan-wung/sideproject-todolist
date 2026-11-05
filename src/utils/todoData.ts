// 할 일·완료 이력의 저장 데이터 검증과 옛 형식 마이그레이션. localStorage에서 읽을 때와 백업 파일을 가져올 때 같이 쓴다.
import type { Todo, CompletionLogEntry } from '../types/todo';
import { normalizeKind } from './kind';

export function normalizePriority(value: unknown): Todo['priority'] {
  return value === 'low' || value === 'medium' || value === 'high' ? value : 'medium';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function migrateTodo(raw: any): Todo {
  const { memoId, ...rest } = raw;
  if (Array.isArray(rest.memoIds)) {
    return rest as Todo; // 이미 신규 포맷 — 그대로 통과 (idempotent)
  }
  if (typeof memoId === 'string' && memoId) {
    return { ...rest, memoIds: [memoId] } as Todo;
  }
  return rest as Todo;
}

export function validateTodos(incoming: unknown): Todo[] | null {
  if (!Array.isArray(incoming)) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ok = incoming.every((o: any) => o && typeof o.id === 'string' && typeof o.text === 'string');
  if (!ok) return null;
  
  return incoming.map(o => {
    const migrated = migrateTodo(o);
    const priority = normalizePriority(migrated.priority);
    const completed = typeof migrated.completed === 'boolean' ? migrated.completed : false;
    const category = typeof migrated.category === 'string' ? migrated.category : '기본';
    const createdAt = typeof migrated.createdAt === 'string' ? migrated.createdAt : new Date().toISOString();
    
    let subtasks = migrated.subtasks;
    if (Array.isArray(subtasks)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      subtasks = subtasks.filter((s: any) => s && typeof s.id === 'string' && typeof s.text === 'string');
    } else {
      subtasks = undefined;
    }

    let memoIds = migrated.memoIds;
    if (Array.isArray(memoIds)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      memoIds = memoIds.filter((m: any) => typeof m === 'string');
    } else {
      memoIds = undefined;
    }

    // 시작일은 문자열이고 마감일보다 앞설 때만 인정한다 (손상된 값은 버린다)
    const startDate = typeof migrated.startDate === 'string' && typeof migrated.dueDate === 'string' && migrated.startDate < migrated.dueDate
      ? migrated.startDate
      : undefined;

    return {
      ...migrated,
      priority,
      completed,
      category,
      createdAt,
      startDate,
      subtasks,
      memoIds,
      kind: normalizeKind(migrated.kind),
    } as Todo;
  });
}

export function validateCompletionLog(incoming: unknown): CompletionLogEntry[] | null {
  if (!Array.isArray(incoming)) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ok = incoming.every((o: any) => o && typeof o.id === 'string' && typeof o.text === 'string' && typeof o.completedAt === 'string');
  if (!ok) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return incoming.map((o: any) => ({
    id: o.id,
    text: o.text,
    category: typeof o.category === 'string' ? o.category : '기본',
    priority: normalizePriority(o.priority),
    completedAt: o.completedAt,
    kind: normalizeKind(o.kind),
    startDate: typeof o.startDate === 'string' ? o.startDate : undefined,
    dueDate: typeof o.dueDate === 'string' ? o.dueDate : undefined,
    subtasks: Array.isArray(o.subtasks)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? o.subtasks.filter((s: any) => s && typeof s.text === 'string').map((s: any) => ({ text: s.text, completed: !!s.completed }))
      : undefined,
  }));
}

// 삭제되는 완료 항목을 완료 이력에 남길 모양으로 바꾼다.
export function toCompletionLogEntry(t: Todo): CompletionLogEntry {
  return {
    id: t.id,
    text: t.text,
    category: t.category,
    priority: t.priority,
    completedAt: t.completedAt ?? t.createdAt,
    kind: normalizeKind(t.kind),
    startDate: t.startDate,
    dueDate: t.dueDate,
    subtasks: t.subtasks?.map(s => ({ text: s.text, completed: s.completed })),
  };
}
