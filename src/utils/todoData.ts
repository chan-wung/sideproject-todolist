// 할 일·완료 이력의 저장 데이터 검증과 옛 형식 마이그레이션. localStorage에서 읽을 때와 백업 파일을 가져올 때 같이 쓴다.
import type { Todo, CompletionLogEntry } from '../types/todo';
import { normalizeKind } from './kind';
import { isValidDateStr, isValidTimestamp } from './date';

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

// 하위 항목: 필드가 빠진 옛 데이터(completed 없음)는 미완료로 읽고, 모양이 틀린 항목이 있으면 몰래 버리지 않고 null(전체 거부).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseSubtasks(list: any[]): Todo['subtasks'] | null {
  const out: NonNullable<Todo['subtasks']> = [];
  for (const s of list) {
    if (!s || typeof s.id !== 'string' || typeof s.text !== 'string') return null;
    if (s.completed !== undefined && typeof s.completed !== 'boolean') return null;
    out.push({ ...s, completed: s.completed ?? false });
  }
  return new Set(out.map(s => s.id)).size === out.length ? out : null; // 같은 부모 안에서 ID가 겹치면 거부
}

export function validateTodos(incoming: unknown): Todo[] | null {
  if (!Array.isArray(incoming)) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ok = incoming.every((o: any) => o && typeof o.id === 'string' && typeof o.text === 'string');
  if (!ok) return null;
  // ID가 겹치면 삭제·Undo가 엉뚱한 항목에 걸리므로 몰래 하나로 줄이지 않고 전체를 거부한다
  if (new Set(incoming.map((o: { id: string }) => o.id)).size !== incoming.length) return null;
  // 없는 값은 옛 데이터로 보고 채우되, 있는데 읽을 수 없는 시각은 손상으로 보고 거부한다
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (incoming.some((o: any) => (o.createdAt !== undefined && !isValidTimestamp(o.createdAt)) || (o.completedAt !== undefined && !isValidTimestamp(o.completedAt)))) return null;

  const parsed = incoming.map(o => {
    const migrated = migrateTodo(o);
    const priority = normalizePriority(migrated.priority);
    const completed = typeof migrated.completed === 'boolean' ? migrated.completed : false;
    const category = typeof migrated.category === 'string' ? migrated.category : '기본';
    const createdAt = typeof migrated.createdAt === 'string' ? migrated.createdAt : new Date().toISOString();
    
    const subtasks = Array.isArray(migrated.subtasks) ? parseSubtasks(migrated.subtasks) : undefined;
    if (subtasks === null) return null;

    let memoIds = migrated.memoIds;
    if (Array.isArray(memoIds)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      memoIds = memoIds.filter((m: any) => typeof m === 'string');
    } else {
      memoIds = undefined;
    }

    // 날짜는 달력에 실제로 있는 날짜만 인정한다 (손상된 값은 버린다). 시작일은 마감일보다 앞설 때만 인정한다.
    const dueDate = isValidDateStr(migrated.dueDate) ? migrated.dueDate : undefined;
    const startDate = isValidDateStr(migrated.startDate) && dueDate && migrated.startDate < dueDate
      ? migrated.startDate
      : undefined;

    return {
      ...migrated,
      priority,
      completed,
      category,
      createdAt,
      dueDate,
      startDate,
      subtasks,
      memoIds,
      kind: normalizeKind(migrated.kind),
    } as Todo;
  });
  return parsed.some(t => t === null) ? null : (parsed as Todo[]);
}

export function validateCompletionLog(incoming: unknown): CompletionLogEntry[] | null {
  if (!Array.isArray(incoming)) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ok = incoming.every((o: any) => o && typeof o.id === 'string' && typeof o.text === 'string' && isValidTimestamp(o.completedAt));
  if (!ok) return null;
  // 하위 항목 모양이 틀린 이력이 있으면 몰래 버리지 않고 전체를 거부한다
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subtasksOk = incoming.every((o: any) => o.subtasks === undefined || (Array.isArray(o.subtasks) && o.subtasks.every((s: any) => s && typeof s.text === 'string' && (s.completed === undefined || typeof s.completed === 'boolean'))));
  if (!subtasksOk) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return incoming.map((o: any) => ({
    id: o.id,
    text: o.text,
    category: typeof o.category === 'string' ? o.category : '기본',
    priority: normalizePriority(o.priority),
    completedAt: o.completedAt,
    kind: normalizeKind(o.kind),
    startDate: isValidDateStr(o.startDate) ? o.startDate : undefined,
    dueDate: isValidDateStr(o.dueDate) ? o.dueDate : undefined,
    subtasks: Array.isArray(o.subtasks)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? o.subtasks.map((s: any) => ({ text: s.text, completed: s.completed === true }))
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
