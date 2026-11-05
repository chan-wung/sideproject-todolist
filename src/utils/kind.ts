import type { TodoKind } from '../types/todo';
import { KIND_OPTIONS } from '../constants/labels';

export function isTodoKind(v: unknown): v is TodoKind {
  return typeof v === 'string' && (KIND_OPTIONS as string[]).includes(v);
}

// 저장된 값이 없거나 알 수 없는 값이면 일반 업무로 본다.
export function normalizeKind(v: unknown): TodoKind {
  return isTodoKind(v) ? v : 'task';
}
