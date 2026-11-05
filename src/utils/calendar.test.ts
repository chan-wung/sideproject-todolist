import { describe, it, expect } from 'vitest';
import { buildCalendarItems, monthRange } from './calendar';
import type { Todo, RecurrenceSeries } from '../types/todo';

// 업체·업무 이름은 모두 가상의 이름이다.
const NOV = { from: '2026-11-01', to: '2026-11-30' };
const TODAY = '2026-11-04';

function todo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: Math.random().toString(36).slice(2),
    text: '업무',
    completed: false,
    priority: 'medium',
    category: '기본',
    createdAt: '2026-10-30T09:00:00',
    dueDate: '2026-11-10',
    ...overrides,
  };
}

function series(overrides: Partial<RecurrenceSeries> = {}): RecurrenceSeries {
  return {
    id: 's1',
    text: '바이러스 검사',
    category: '기본',
    priority: 'medium',
    frequency: 'weekly',
    anchorDate: '2026-11-02',
    kind: 'routine',
    status: 'active',
    createdAt: '2026-10-30T09:00:00',
    ...overrides,
  };
}

function build(todos: Todo[] = [], seriesList: RecurrenceSeries[] = [], range = NOV, today = TODAY) {
  return buildCalendarItems({ todos, series: seriesList, ...range, today });
}

describe('monthRange', () => {
  it('그 달의 첫날과 마지막 날', () => {
    expect(monthRange(2026, 10)).toEqual({ from: '2026-11-01', to: '2026-11-30' });
    expect(monthRange(2028, 1)).toEqual({ from: '2028-02-01', to: '2028-02-29' }); // 윤년
    expect(monthRange(2026, 11)).toEqual({ from: '2026-12-01', to: '2026-12-31' });
  });
});

describe('buildCalendarItems — 할 일', () => {
  it('마감일이 그 달에 있는 할 일만 그 날짜에 넣는다', () => {
    const items = build([
      todo({ id: 'a', dueDate: '2026-11-10' }),
      todo({ id: 'b', dueDate: '2026-11-10' }),
      todo({ id: 'c', dueDate: '2026-12-01' }), // 다음 달
      todo({ id: 'd', dueDate: '2026-10-31' }), // 지난달
      todo({ id: 'e', dueDate: undefined }),     // 마감일 없음
    ]);
    expect(Object.keys(items)).toEqual(['2026-11-10']);
    expect(items['2026-11-10'].map(i => i.todoId).sort()).toEqual(['a', 'b']);
    expect(items['2026-11-10'][0].upcoming).toBe(false);
  });

  it('달의 첫날·마지막 날 경계도 포함한다', () => {
    const items = build([todo({ dueDate: '2026-11-01' }), todo({ dueDate: '2026-11-30' })]);
    expect(Object.keys(items).sort()).toEqual(['2026-11-01', '2026-11-30']);
  });

  it('같은 날 순서: 연차 → 정기 업무 → 일반 업무, 미완료가 완료보다 앞, 그다음 우선순위', () => {
    const items = build([
      todo({ id: 'done-task', completed: true, priority: 'high' }),
      todo({ id: 'low-task', priority: 'low' }),
      todo({ id: 'high-task', priority: 'high' }),
      todo({ id: 'routine', kind: 'routine' }),
      todo({ id: 'leave', kind: 'leave' }),
    ]);
    expect(items['2026-11-10'].map(i => i.todoId)).toEqual(['leave', 'routine', 'high-task', 'low-task', 'done-task']);
  });

  it('kind가 없는 옛 할 일은 일반 업무로 본다', () => {
    const items = build([todo({ kind: undefined })]);
    expect(items['2026-11-10'][0].kind).toBe('task');
  });
});

describe('buildCalendarItems — 반복 일정 예정', () => {
  it('오늘 이후의 회차만 예정으로 넣는다', () => {
    const items = build([], [series()]); // 매주 월요일, 기준일 11/2, 오늘 11/4(수)
    expect(Object.keys(items)).toEqual(['2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30']);
    const first = items['2026-11-09'][0];
    expect(first).toMatchObject({ text: '바이러스 검사', kind: 'routine', upcoming: true, completed: false });
    expect(first.todoId).toBeUndefined();
  });

  it('오늘 날짜 회차는 이미 할 일로 만들어지므로 예정으로 또 넣지 않는다', () => {
    const items = build([], [series({ anchorDate: '2026-11-04', frequency: 'weekly' })]);
    expect(items['2026-11-04']).toBeUndefined();
    expect(items['2026-11-11']).toHaveLength(1);
  });

  it('이미 같은 시리즈·날짜의 할 일이 있으면 예정은 빼고 할 일만 보여 준다', () => {
    const made = todo({ id: 'occ', seriesId: 's1', dueDate: '2026-11-09', kind: 'routine' });
    const items = build([made], [series()]);
    expect(items['2026-11-09']).toHaveLength(1);
    expect(items['2026-11-09'][0].todoId).toBe('occ');
  });

  it('종료된 시리즈는 예정에서 빼고, 종료일 이후 회차도 넣지 않는다', () => {
    expect(build([], [series({ status: 'ended' })])).toEqual({});
    const limited = build([], [series({ endDate: '2026-11-16' })]);
    expect(Object.keys(limited)).toEqual(['2026-11-09', '2026-11-16']);
  });

  it('지난달을 보면 예정이 없고, 다음 달을 보면 그 달 전체가 예정이다', () => {
    expect(build([], [series()], { from: '2026-10-01', to: '2026-10-31' })).toEqual({});
    const dec = build([], [series()], { from: '2026-12-01', to: '2026-12-31' });
    expect(Object.keys(dec)).toEqual(['2026-12-07', '2026-12-14', '2026-12-21', '2026-12-28']);
  });

  it('매월 반복은 월말에 맞춰 예정한다', () => {
    const items = build([], [series({ frequency: 'monthly', anchorDate: '2026-10-31' })], { from: '2026-11-01', to: '2026-11-30' });
    expect(Object.keys(items)).toEqual(['2026-11-30']);
  });
});
