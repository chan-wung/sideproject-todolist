import { describe, it, expect } from 'vitest';
import { buildCalendarItems, monthRange, itemsOnDate, formatPeriod, layoutMonth, type CalendarItem } from './calendar';
import type { Todo, RecurrenceSeries, CompletionLogEntry } from '../types/todo';

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

function logEntry(overrides: Partial<CompletionLogEntry> = {}): CompletionLogEntry {
  return {
    id: Math.random().toString(36).slice(2),
    text: '정리된 업무',
    category: '기본',
    priority: 'medium',
    completedAt: '2026-11-03T15:00:00',
    ...overrides,
  };
}

function build(
  todos: Todo[] = [],
  seriesList: RecurrenceSeries[] = [],
  range = NOV,
  today = TODAY,
  completionLog: CompletionLogEntry[] = [],
) {
  return buildCalendarItems({ todos, series: seriesList, completionLog, ...range, today });
}

// 항목이 걸친 기간을 '시작~끝'으로 읽기 쉽게 바꾼다
const spans = (items: CalendarItem[]) => items.map(i => `${i.start}~${i.end}`).sort();
const upcomingDates = (items: CalendarItem[]) => items.filter(i => i.upcoming).map(i => i.start).sort();

describe('monthRange', () => {
  it('그 달의 첫날과 마지막 날', () => {
    expect(monthRange(2026, 10)).toEqual({ from: '2026-11-01', to: '2026-11-30' });
    expect(monthRange(2028, 1)).toEqual({ from: '2028-02-01', to: '2028-02-29' }); // 윤년
    expect(monthRange(2026, 11)).toEqual({ from: '2026-12-01', to: '2026-12-31' });
  });
});

describe('buildCalendarItems — 할 일', () => {
  it('마감일이 그 달에 걸친 할 일만 넣는다 (하루짜리는 마감일 하루)', () => {
    const items = build([
      todo({ id: 'a', dueDate: '2026-11-10' }),
      todo({ id: 'b', dueDate: '2026-11-10' }),
      todo({ id: 'c', dueDate: '2026-12-01' }), // 다음 달
      todo({ id: 'd', dueDate: '2026-10-31' }), // 지난달
    ]);
    expect(items.map(i => i.todoId).sort()).toEqual(['a', 'b']);
    expect(spans(items)).toEqual(['2026-11-10~2026-11-10', '2026-11-10~2026-11-10']);
    expect(items[0].upcoming).toBe(false);
    expect(items[0].logged).toBe(false);
  });

  it('달의 첫날·마지막 날 경계도 포함한다', () => {
    const items = build([todo({ dueDate: '2026-11-01' }), todo({ dueDate: '2026-11-30' })]);
    expect(spans(items)).toEqual(['2026-11-01~2026-11-01', '2026-11-30~2026-11-30']);
  });

  it('시작일이 있으면 시작일~마감일 기간으로 넣고, 달에 일부만 걸쳐도 포함한다', () => {
    const items = build([
      todo({ id: 'in', startDate: '2026-11-03', dueDate: '2026-11-05' }),
      todo({ id: 'from-oct', startDate: '2026-10-28', dueDate: '2026-11-02' }),
      todo({ id: 'to-dec', startDate: '2026-11-28', dueDate: '2026-12-03' }),
      todo({ id: 'before', startDate: '2026-10-01', dueDate: '2026-10-31' }),
      todo({ id: 'after', startDate: '2026-12-01', dueDate: '2026-12-05' }),
    ]);
    expect(items.map(i => i.todoId).sort()).toEqual(['from-oct', 'in', 'to-dec']);
    // 기간은 달 경계에서 자르지 않고 그대로 담는다 (자르는 건 배치 단계)
    expect(items.find(i => i.todoId === 'from-oct')).toMatchObject({ start: '2026-10-28', end: '2026-11-02' });
  });

  it('날짜가 없는 할 일은 등록한 날에 넣는다 (완료한 것도 포함)', () => {
    const items = build([
      todo({ id: 'u1', dueDate: undefined, createdAt: '2026-11-06T09:00:00' }),
      todo({ id: 'u2', dueDate: undefined, completed: true, createdAt: '2026-11-06T18:00:00' }),
      todo({ id: 'u3', dueDate: undefined, createdAt: '2026-10-06T09:00:00' }), // 지난달에 등록
    ]);
    expect(items.map(i => i.todoId).sort()).toEqual(['u1', 'u2']);
    expect(spans(items)).toEqual(['2026-11-06~2026-11-06', '2026-11-06~2026-11-06']);
  });

  it('완료한 할 일도 마감일에 넣는다', () => {
    const items = build([todo({ completed: true })]);
    expect(items).toHaveLength(1);
    expect(items[0].completed).toBe(true);
  });

  it('시작·마감이 뒤집혀 저장돼 있어도 바로잡아 보여 준다', () => {
    const items = build([todo({ startDate: '2026-11-12', dueDate: '2026-11-10' })]);
    expect(spans(items)).toEqual(['2026-11-10~2026-11-12']);
  });

  it('kind가 없는 옛 할 일은 일반 업무로 본다', () => {
    expect(build([todo({ kind: undefined })])[0].kind).toBe('task');
  });
});

describe('buildCalendarItems — 완료 이력', () => {
  it('목록에서 빠진 완료 이력을 원래 기간에 넣는다', () => {
    const items = build([], [], NOV, TODAY, [
      logEntry({ id: 'p', startDate: '2026-11-03', dueDate: '2026-11-05' }),
      logEntry({ id: 'd', dueDate: '2026-11-12' }),
    ]);
    expect(spans(items)).toEqual(['2026-11-03~2026-11-05', '2026-11-12~2026-11-12']);
    expect(items.every(i => i.completed && i.logged && !i.upcoming && i.todoId === undefined)).toBe(true);
  });

  it('기간이 남아 있지 않은 예전 이력은 완료한 날에 넣는다', () => {
    const items = build([], [], NOV, TODAY, [logEntry({ completedAt: '2026-11-03T15:00:00' })]);
    expect(spans(items)).toEqual(['2026-11-03~2026-11-03']);
  });

  it('목록에 아직 있는 할 일의 이력은 중복해서 넣지 않는다', () => {
    const items = build(
      [todo({ id: 'same', dueDate: '2026-11-10' })],
      [],
      NOV,
      TODAY,
      [logEntry({ id: 'same', dueDate: '2026-11-10' })],
    );
    expect(items).toHaveLength(1);
    expect(items[0].logged).toBe(false);
  });

  it('같은 id의 이력이 여러 건이어도 키가 겹치지 않는다', () => {
    const items = build([], [], NOV, TODAY, [
      logEntry({ id: 'dup', completedAt: '2026-11-03T10:00:00' }),
      logEntry({ id: 'dup', completedAt: '2026-11-04T10:00:00' }),
    ]);
    expect(new Set(items.map(i => i.key)).size).toBe(2);
  });

  it('다른 달의 이력은 넣지 않는다', () => {
    expect(build([], [], NOV, TODAY, [logEntry({ completedAt: '2026-10-03T10:00:00' })])).toEqual([]);
  });
});

describe('itemsOnDate · formatPeriod', () => {
  const items = build([
    todo({ id: 'range', startDate: '2026-11-03', dueDate: '2026-11-05' }),
    todo({ id: 'one', dueDate: '2026-11-04' }),
    todo({ id: 'done-task', completed: true, priority: 'high', dueDate: '2026-11-04' }),
    todo({ id: 'low-task', priority: 'low', dueDate: '2026-11-04' }),
    todo({ id: 'high-task', priority: 'high', dueDate: '2026-11-04' }),
    todo({ id: 'routine', kind: 'routine', dueDate: '2026-11-04' }),
    todo({ id: 'leave', kind: 'leave', dueDate: '2026-11-04' }),
  ]);

  it('기간 항목은 기간 안의 모든 날에 나온다', () => {
    expect(itemsOnDate(items, '2026-11-03').map(i => i.todoId)).toEqual(['range']);
    expect(itemsOnDate(items, '2026-11-05').map(i => i.todoId)).toEqual(['range']);
    expect(itemsOnDate(items, '2026-11-06')).toEqual([]);
  });

  it('같은 날 순서: 연차 → 정기 업무 → 일반 업무, 미완료가 완료보다 앞, 그다음 우선순위', () => {
    const ids = itemsOnDate(items, '2026-11-04').map(i => i.todoId);
    expect(ids.slice(0, 3)).toEqual(['leave', 'routine', 'high-task']);
    expect(ids.indexOf('one')).toBeLessThan(ids.indexOf('low-task'));
    expect(ids.indexOf('range')).toBeLessThan(ids.indexOf('low-task'));
    expect(ids[ids.length - 1]).toBe('done-task');
  });

  it('기간 표기: 하루짜리는 비고, 기간이면 "월.일 ~ 월.일"', () => {
    expect(formatPeriod({ start: '2026-11-04', end: '2026-11-04' })).toBe('');
    expect(formatPeriod({ start: '2026-11-03', end: '2026-11-05' })).toBe('11.3 ~ 11.5');
    expect(formatPeriod({ start: '2026-10-28', end: '2026-11-02' })).toBe('10.28 ~ 11.2');
  });
});

describe('buildCalendarItems — 반복 일정 예정', () => {
  it('오늘 이후의 회차만 예정으로 넣는다', () => {
    const items = build([], [series()]); // 매주 월요일, 기준일 11/2, 오늘 11/4(수)
    expect(upcomingDates(items)).toEqual(['2026-11-09', '2026-11-16', '2026-11-23', '2026-11-30']);
    expect(items[0]).toMatchObject({ text: '바이러스 검사', kind: 'routine', upcoming: true, completed: false, logged: false });
    expect(items[0].todoId).toBeUndefined();
  });

  it('오늘 날짜 회차는 이미 할 일로 만들어지므로 예정으로 또 넣지 않는다', () => {
    const items = build([], [series({ anchorDate: '2026-11-04', frequency: 'weekly' })]);
    expect(upcomingDates(items)).not.toContain('2026-11-04');
    expect(upcomingDates(items)).toContain('2026-11-11');
  });

  it('이미 같은 시리즈·날짜의 할 일이 있으면 예정은 빼고 할 일만 보여 준다', () => {
    const made = todo({ id: 'occ', seriesId: 's1', dueDate: '2026-11-09', kind: 'routine' });
    const items = build([made], [series()]);
    const onNinth = itemsOnDate(items, '2026-11-09');
    expect(onNinth).toHaveLength(1);
    expect(onNinth[0].todoId).toBe('occ');
  });

  it('종료된 시리즈는 예정에서 빼고, 종료일 이후 회차도 넣지 않는다', () => {
    expect(build([], [series({ status: 'ended' })])).toEqual([]);
    expect(upcomingDates(build([], [series({ endDate: '2026-11-16' })]))).toEqual(['2026-11-09', '2026-11-16']);
  });

  it('지난달을 보면 예정이 없고, 다음 달을 보면 그 달 전체가 예정이다', () => {
    expect(build([], [series()], { from: '2026-10-01', to: '2026-10-31' })).toEqual([]);
    const dec = build([], [series()], { from: '2026-12-01', to: '2026-12-31' });
    expect(upcomingDates(dec)).toEqual(['2026-12-07', '2026-12-14', '2026-12-21', '2026-12-28']);
  });

  it('매월 반복은 월말에 맞춰 예정한다', () => {
    const items = build([], [series({ frequency: 'monthly', anchorDate: '2026-10-31' })], { from: '2026-11-01', to: '2026-11-30' });
    expect(upcomingDates(items)).toEqual(['2026-11-30']);
  });
});

// 2026년 11월: 1일이 일요일이라 앞 빈칸이 없고, 첫 주는 11/1~11/7(일~토), 마지막 주는 11/29~11/30(일, 월)
describe('layoutMonth', () => {
  const layout = (todos: Todo[], maxLanes?: number) =>
    layoutMonth(build(todos), 2026, 10, maxLanes);
  const bar = (b: { col: number; span: number; lane: number }) => `${b.col}+${b.span}@${b.lane}`;

  it('11월은 5주이고, 마지막 주의 남는 칸은 null이다', () => {
    const { weeks } = layout([]);
    expect(weeks).toHaveLength(5);
    expect(weeks[0].dates[0]).toBe('2026-11-01');
    expect(weeks[4].dates).toEqual(['2026-11-29', '2026-11-30', null, null, null, null, null]);
  });

  it('앞 빈칸이 있는 달은 첫 주 앞쪽이 null이다 (2026년 12월은 화요일 시작)', () => {
    const { weeks } = layoutMonth([], 2026, 11);
    expect(weeks[0].dates.slice(0, 3)).toEqual([null, null, '2026-12-01']);
  });

  it('한 주 안의 기간은 시작 칸과 칸 수가 있는 띠 하나가 된다', () => {
    const { weeks } = layout([todo({ startDate: '2026-11-03', dueDate: '2026-11-05' })]); // 화~목
    expect(weeks[0].bars.map(bar)).toEqual(['3+3@0']);
    expect(weeks[0].bars[0]).toMatchObject({ continuesBefore: false, continuesAfter: false });
  });

  it('주를 넘는 기간은 주마다 토막으로 나뉘고, 이어지는 쪽 표시가 붙는다', () => {
    const { weeks } = layout([todo({ startDate: '2026-11-05', dueDate: '2026-11-11' })]); // 목~다음 주 수
    expect(weeks[0].bars.map(bar)).toEqual(['5+3@0']);
    expect(weeks[0].bars[0]).toMatchObject({ continuesBefore: false, continuesAfter: true });
    expect(weeks[1].bars.map(bar)).toEqual(['1+4@0']);
    expect(weeks[1].bars[0]).toMatchObject({ continuesBefore: true, continuesAfter: false });
  });

  it('달을 넘는 기간은 그 달 안쪽만 그리고 바깥쪽은 이어지는 것으로 표시한다', () => {
    const { weeks } = layout([todo({ startDate: '2026-10-28', dueDate: '2026-11-03' })]);
    expect(weeks[0].bars.map(bar)).toEqual(['1+3@0']); // 11/1~11/3
    expect(weeks[0].bars[0]).toMatchObject({ continuesBefore: true, continuesAfter: false });

    const end = layout([todo({ startDate: '2026-11-29', dueDate: '2026-12-03' })]);
    expect(end.weeks[4].bars.map(bar)).toEqual(['1+2@0']); // 11/29~11/30
    expect(end.weeks[4].bars[0]).toMatchObject({ continuesBefore: false, continuesAfter: true });
  });

  it('겹치는 항목은 다른 줄로, 겹치지 않으면 같은 줄을 다시 쓴다', () => {
    const { weeks } = layout([
      todo({ id: 'long', startDate: '2026-11-02', dueDate: '2026-11-06' }),
      todo({ id: 'mid', startDate: '2026-11-04', dueDate: '2026-11-05' }),
      todo({ id: 'after', dueDate: '2026-11-07' }),
    ]);
    const byId = Object.fromEntries(weeks[0].bars.map(b => [b.item.todoId, b.lane]));
    expect(byId).toEqual({ long: 0, mid: 1, after: 0 });
  });

  it('시작이 같으면 긴 기간이 위 줄에 온다', () => {
    const { weeks } = layout([
      todo({ id: 'short', dueDate: '2026-11-02' }),
      todo({ id: 'long', startDate: '2026-11-02', dueDate: '2026-11-04' }),
    ]);
    const byId = Object.fromEntries(weeks[0].bars.map(b => [b.item.todoId, b.lane]));
    expect(byId).toEqual({ long: 0, short: 1 });
  });

  it('줄이 모자라면 넘친 항목은 띠로 그리지 않고 날짜별 +N에 센다', () => {
    const { weeks, total, hidden } = layout([
      todo({ dueDate: '2026-11-10' }),
      todo({ dueDate: '2026-11-10' }),
      todo({ dueDate: '2026-11-10' }),
      todo({ dueDate: '2026-11-10' }),
      todo({ dueDate: '2026-11-10' }),
    ]);
    expect(weeks[1].bars).toHaveLength(3);
    expect(total['2026-11-10']).toBe(5);
    expect(hidden['2026-11-10']).toBe(2);
    expect(hidden['2026-11-11']).toBeUndefined();
  });

  it('기간 항목이 넘치면 기간 안의 모든 날에 +N이 붙는다', () => {
    const { total, hidden } = layout([
      todo({ startDate: '2026-11-02', dueDate: '2026-11-03' }),
      todo({ startDate: '2026-11-02', dueDate: '2026-11-03' }),
      todo({ startDate: '2026-11-02', dueDate: '2026-11-03' }),
      todo({ startDate: '2026-11-02', dueDate: '2026-11-03' }),
    ]);
    expect(total['2026-11-02']).toBe(4);
    expect(total['2026-11-03']).toBe(4);
    expect(hidden['2026-11-02']).toBe(1);
    expect(hidden['2026-11-03']).toBe(1);
  });

  it('보이는 줄 수는 바꿀 수 있다', () => {
    const { weeks, hidden } = layout([todo({ dueDate: '2026-11-10' }), todo({ dueDate: '2026-11-10' })], 1);
    expect(weeks[1].bars).toHaveLength(1);
    expect(hidden['2026-11-10']).toBe(1);
  });
});
