import { describe, it, expect } from 'vitest';
import { isTodoKind, normalizeKind, kindRequiresDate, kindAllowsRecurrence, dueDateLabel } from './kind';

describe('normalizeKind', () => {
  it('알려진 종류는 그대로 둔다', () => {
    expect(normalizeKind('task')).toBe('task');
    expect(normalizeKind('routine')).toBe('routine');
    expect(normalizeKind('leave')).toBe('leave');
  });

  it('없거나 알 수 없는 값은 일반 업무로 본다', () => {
    expect(normalizeKind(undefined)).toBe('task');
    expect(normalizeKind(null)).toBe('task');
    expect(normalizeKind('')).toBe('task');
    expect(normalizeKind('vacation')).toBe('task');
    expect(normalizeKind(1)).toBe('task');
  });
});

describe('isTodoKind', () => {
  it('문자열이 아니거나 목록에 없으면 false', () => {
    expect(isTodoKind('routine')).toBe(true);
    expect(isTodoKind('Routine')).toBe(false);
    expect(isTodoKind(undefined)).toBe(false);
  });
});

describe('종류별 입력 규칙', () => {
  it('연차·휴가만 날짜가 필수이고 반복할 수 없다', () => {
    expect(kindRequiresDate('leave')).toBe(true);
    expect(kindRequiresDate('task')).toBe(false);
    expect(kindRequiresDate('routine')).toBe(false);

    expect(kindAllowsRecurrence('leave')).toBe(false);
    expect(kindAllowsRecurrence('task')).toBe(true);
    expect(kindAllowsRecurrence('routine')).toBe(true);
  });

  it('날짜 입력칸 이름: 연차는 날짜, 나머지는 기간', () => {
    expect(dueDateLabel('leave')).toBe('날짜');
    expect(dueDateLabel('task')).toBe('기간');
    expect(dueDateLabel('routine')).toBe('기간');
  });
});
