import type { TodoKind } from '../types/todo';
import { KIND_OPTIONS } from '../constants/labels';

export function isTodoKind(v: unknown): v is TodoKind {
  return typeof v === 'string' && (KIND_OPTIONS as string[]).includes(v);
}

// 저장된 값이 없거나 알 수 없는 값이면 일반 업무로 본다.
export function normalizeKind(v: unknown): TodoKind {
  return isTodoKind(v) ? v : 'task';
}

// 종류별 입력 규칙. 연차·휴가는 보고서에 날짜가 찍히므로 날짜가 꼭 필요하고, 반복할 수 없다.
export function kindRequiresDate(kind: TodoKind): boolean {
  return kind === 'leave';
}

export function kindAllowsRecurrence(kind: TodoKind): boolean {
  return kind !== 'leave';
}

// 날짜 입력칸의 이름 (연차는 쉬는 날짜 하나, 나머지는 시작일~마감일 기간)
export function dueDateLabel(kind: TodoKind): string {
  return kind === 'leave' ? '날짜' : '기간';
}
