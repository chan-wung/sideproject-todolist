import type { Todo, RecurrenceSeries, TodoKind } from '../types/todo';
import { occurrencesInRange, addDaysStr, dateStr, daysInMonth } from './date';
import { normalizeKind } from './kind';

export interface CalendarItem {
  /** 같은 날 안에서 항목을 구분하는 키 (할 일은 id, 예정 회차는 시리즈 id + 날짜) */
  key: string;
  text: string;
  kind: TodoKind;
  category: string;
  priority: Todo['priority'];
  completed: boolean;
  /** true면 아직 할 일로 만들어지지 않은 반복 일정의 앞날 회차 */
  upcoming: boolean;
  /** 실제 할 일이면 그 id (예정 회차는 없음) */
  todoId?: string;
}

export type CalendarItemsByDate = Record<string, CalendarItem[]>;

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

// 한 달 범위(from~to)에서 날짜별로 보여 줄 항목을 모은다.
// - 마감일(dueDate)이 있는 할 일은 그 날짜에 넣는다 (연차·정기 업무 포함).
// - 진행 중인 반복 일정의 앞날 회차(today 이후, 아직 할 일로 만들어지지 않은 것)는 '예정'으로 넣는다.
export function buildCalendarItems(input: {
  todos: Todo[];
  series: RecurrenceSeries[];
  from: string;
  to: string;
  today: string;
}): CalendarItemsByDate {
  const { todos, series, from, to, today } = input;
  const byDate: CalendarItemsByDate = {};
  const push = (date: string, item: CalendarItem) => {
    (byDate[date] ??= []).push(item);
  };

  for (const t of todos) {
    if (!t.dueDate || t.dueDate < from || t.dueDate > to) continue;
    push(t.dueDate, {
      key: t.id,
      text: t.text,
      kind: normalizeKind(t.kind),
      category: t.category,
      priority: t.priority,
      completed: t.completed,
      upcoming: false,
      todoId: t.id,
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
      push(date, {
        key: `${s.id}|${date}`,
        text: s.text,
        kind: normalizeKind(s.kind),
        category: s.category,
        priority: s.priority,
        completed: false,
        upcoming: true,
      });
    }
  }

  for (const date of Object.keys(byDate)) byDate[date].sort(compareItems);
  return byDate;
}
