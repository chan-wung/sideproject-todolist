import type { Todo, RecurrenceSeries, TodoKind, CompletionLogEntry } from '../types/todo';
import { occurrencesInRange, addDaysStr, dateStr, daysInMonth, toLocalDateStr } from './date';
import { normalizeKind } from './kind';

export interface CalendarItem {
  /** 항목을 구분하는 키 (할 일은 id, 예정 회차는 시리즈 id + 날짜, 완료 이력은 id + 완료 시각) */
  key: string;
  text: string;
  kind: TodoKind;
  category: string;
  priority: Todo['priority'];
  completed: boolean;
  /** true면 아직 할 일로 만들어지지 않은 반복 일정의 앞날 회차 */
  upcoming: boolean;
  /** true면 '완료 정리'로 목록에서 빠져 완료 이력에만 남은 항목 */
  logged: boolean;
  /** 실제 할 일이면 그 id (예정 회차·완료 이력은 없음) */
  todoId?: string;
  /** 보이는 기간. 하루짜리면 start와 end가 같다. */
  start: string;
  end: string;
}

const KIND_ORDER: Record<TodoKind, number> = { leave: 0, routine: 1, task: 2 };
const PRIORITY_ORDER: Record<Todo['priority'], number> = { high: 0, medium: 1, low: 2 };

// 같은 날 안의 순서: 연차 → 정기 업무 → 일반 업무, 미완료가 완료보다 앞, 그다음 우선순위
function compareItems(a: CalendarItem, b: CalendarItem): number {
  return (
    KIND_ORDER[a.kind] - KIND_ORDER[b.kind] ||
    Number(a.completed) - Number(b.completed) ||
    PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  );
}

// 해당 달(month0: 0=1월)의 첫날과 마지막 날
export function monthRange(year: number, month0: number): { from: string; to: string } {
  return { from: dateStr(year, month0, 1), to: dateStr(year, month0, daysInMonth(year, month0)) };
}

// 시작·끝 날짜를 정한다. 둘 중 하나만 있으면 하루짜리, 둘 다 없으면 fallback 날짜 하루. 순서가 뒤집혀 있으면 바로잡는다.
function periodOf(startDate: string | undefined, dueDate: string | undefined, fallback: string): { start: string; end: string } | null {
  const a = startDate || dueDate || fallback;
  const b = dueDate || startDate || fallback;
  if (!a || !b) return null; // 날짜를 알 수 없으면 보여 줄 곳이 없다
  return a <= b ? { start: a, end: b } : { start: b, end: a };
}

// from~to 범위(한 달)에 걸치는 항목을 모두 모은다.
// - 할 일: 시작일~마감일(없으면 마감일 하루, 둘 다 없으면 등록한 날)에 넣는다. 완료한 것도 포함한다.
// - 완료 이력: '완료 정리'로 목록에서 빠진 항목도 원래 기간에 넣는다 (기간이 남아 있지 않으면 완료한 날).
// - 진행 중인 반복 일정의 앞날 회차(today 이후, 아직 할 일로 만들어지지 않은 것)는 '예정'으로 넣는다.
export function buildCalendarItems(input: {
  todos: Todo[];
  series: RecurrenceSeries[];
  completionLog?: CompletionLogEntry[];
  from: string;
  to: string;
  today: string;
}): CalendarItem[] {
  const { todos, series, completionLog = [], from, to, today } = input;
  const items: CalendarItem[] = [];
  const overlaps = (p: { start: string; end: string }) => p.end >= from && p.start <= to;

  for (const t of todos) {
    const period = periodOf(t.startDate, t.dueDate, toLocalDateStr(t.createdAt));
    if (!period || !overlaps(period)) continue;
    items.push({
      key: t.id,
      text: t.text,
      kind: normalizeKind(t.kind),
      category: t.category,
      priority: t.priority,
      completed: t.completed,
      upcoming: false,
      logged: false,
      todoId: t.id,
      ...period,
    });
  }

  // 목록에 아직 있는 할 일은 이미 위에서 넣었으니, 이력에만 남은 항목만 더한다
  const todoIds = new Set(todos.map(t => t.id));
  for (const e of completionLog) {
    if (todoIds.has(e.id)) continue;
    const period = periodOf(e.startDate, e.dueDate, toLocalDateStr(e.completedAt));
    if (!period || !overlaps(period)) continue;
    items.push({
      key: `log:${e.id}|${e.completedAt}`,
      text: e.text,
      kind: normalizeKind(e.kind),
      category: e.category,
      priority: e.priority,
      completed: true,
      upcoming: false,
      logged: true,
      ...period,
    });
  }

  // 이미 같은 시리즈·날짜의 할 일이 있으면 예정으로 또 보여 주지 않는다
  const existing = new Set(todos.filter(t => t.seriesId && t.dueDate).map(t => `${t.seriesId}|${t.dueDate}`));
  const futureFrom = addDaysStr(today, 1) > from ? addDaysStr(today, 1) : from;

  for (const s of series) {
    if (s.status !== 'active' || futureFrom > to) continue;
    const last = s.endDate && s.endDate < to ? s.endDate : to;
    for (const date of occurrencesInRange(s.anchorDate, s.frequency, futureFrom, last)) {
      if (existing.has(`${s.id}|${date}`)) continue;
      items.push({
        key: `${s.id}|${date}`,
        text: s.text,
        kind: normalizeKind(s.kind),
        category: s.category,
        priority: s.priority,
        completed: false,
        upcoming: true,
        logged: false,
        start: date,
        end: date,
      });
    }
  }

  return items.sort((a, b) => compareItems(a, b) || a.start.localeCompare(b.start));
}

// 그 날짜에 걸쳐 있는 항목 (기간 항목은 기간 안의 모든 날에 나온다)
export function itemsOnDate(items: CalendarItem[], date: string): CalendarItem[] {
  return items.filter(i => i.start <= date && date <= i.end).sort(compareItems);
}

// '11.3 ~ 11.5' 같은 기간 표기. 하루짜리면 빈 문자열.
export function formatPeriod(item: Pick<CalendarItem, 'start' | 'end'>): string {
  if (item.start === item.end) return '';
  const md = (d: string) => `${Number(d.slice(5, 7))}.${Number(d.slice(8, 10))}`;
  return `${md(item.start)} ~ ${md(item.end)}`;
}

// ── 달력에 띠를 놓는 배치 ──

/** 한 주(7칸) 안에 그려지는 띠 한 토막. 여러 주에 걸친 기간은 주마다 한 토막씩 나뉜다. */
export interface WeekBar {
  item: CalendarItem;
  /** 시작 칸(1=일요일 … 7=토요일)과 차지하는 칸 수 */
  col: number;
  span: number;
  /** 위에서부터 몇 번째 줄인지 (0부터) */
  lane: number;
  /** 이 토막 앞뒤로 기간이 이어지는지 (이어지면 그쪽 모서리를 둥글게 하지 않는다) */
  continuesBefore: boolean;
  continuesAfter: boolean;
}

export interface MonthWeek {
  /** 일~토 7칸의 날짜. 그 달이 아닌 칸은 null */
  dates: (string | null)[];
  /** 보이는 줄(maxLanes 이내)에 놓인 띠만 */
  bars: WeekBar[];
}

export interface MonthLayout {
  weeks: MonthWeek[];
  /** 날짜별 전체 항목 수 */
  total: Record<string, number>;
  /** 날짜별로 줄이 모자라 가려진 항목 수 ('+N') */
  hidden: Record<string, number>;
}

export interface WeekLayout {
  bars: WeekBar[];
  /** 날짜별 전체 항목 수 */
  total: Record<string, number>;
  /** 날짜별로 줄이 모자라 가려진 항목 수 ('+N') */
  hidden: Record<string, number>;
}

// 한 주(7칸)의 항목들을 띠로 나누고 겹치지 않게 줄을 배정한다. dates의 null 칸(그 달이 아닌 칸)은 건너뛴다.
// 시작이 빠른 것, 같으면 긴 것, 같으면 날짜 안 순서(연차 → 정기 → 일반 …) 순으로 위 줄부터 놓는다.
// maxLanes를 넘는 줄의 띠는 그리지 않고 날짜별 hidden 수에만 센다.
export function layoutWeek(items: CalendarItem[], dates: (string | null)[], maxLanes = 3): WeekLayout {
  const segs: WeekBar[] = [];
  const total: Record<string, number> = {};
  const hidden: Record<string, number> = {};

  for (const item of items) {
    let c0 = -1;
    let c1 = -1;
    dates.forEach((date, c) => {
      if (date && item.start <= date && date <= item.end) {
        if (c0 === -1) c0 = c;
        c1 = c;
      }
    });
    if (c0 === -1) continue;
    segs.push({
      item,
      col: c0 + 1,
      span: c1 - c0 + 1,
      lane: 0,
      continuesBefore: item.start < (dates[c0] as string),
      continuesAfter: item.end > (dates[c1] as string),
    });
    for (let c = c0; c <= c1; c++) {
      const date = dates[c] as string;
      total[date] = (total[date] ?? 0) + 1;
    }
  }

  segs.sort((a, b) => a.col - b.col || b.span - a.span || compareItems(a.item, b.item));
  const bars: WeekBar[] = [];
  const laneEnds: number[] = []; // 줄마다 마지막으로 쓰인 칸
  for (const seg of segs) {
    let lane = laneEnds.findIndex(end => end < seg.col);
    if (lane === -1) lane = laneEnds.length;
    laneEnds[lane] = seg.col + seg.span - 1;
    seg.lane = lane;
    if (lane < maxLanes) {
      bars.push(seg);
    } else {
      for (let c = seg.col - 1; c < seg.col - 1 + seg.span; c++) {
        const date = dates[c] as string;
        hidden[date] = (hidden[date] ?? 0) + 1;
      }
    }
  }
  return { bars, total, hidden };
}

// 한 달의 항목들을 주 단위로 나눠 layoutWeek로 띠를 배치한다.
export function layoutMonth(items: CalendarItem[], year: number, month0: number, maxLanes = 3): MonthLayout {
  const dayCount = daysInMonth(year, month0);
  const blank = new Date(year, month0, 1).getDay(); // 1일 앞의 빈칸 수 (일요일 시작)
  const weekCount = Math.ceil((blank + dayCount) / 7);
  const total: Record<string, number> = {};
  const hidden: Record<string, number> = {};

  const weeks: MonthWeek[] = Array.from({ length: weekCount }, (_, w) => {
    const dates = Array.from({ length: 7 }, (_, c) => {
      const day = w * 7 + c - blank + 1;
      return day >= 1 && day <= dayCount ? dateStr(year, month0, day) : null;
    });
    const week = layoutWeek(items, dates, maxLanes);
    Object.assign(total, week.total);
    Object.assign(hidden, week.hidden);
    return { dates, bars: week.bars };
  });

  return { weeks, total, hidden };
}
