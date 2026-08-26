import type { Todo, RecurrenceSeries, RecurrenceFrequency } from '../types/todo';
import { addDaysStr, occurrencesInRange } from './date';
import { generateId } from './id';

const FREQUENCIES: RecurrenceFrequency[] = ['daily', 'weekly', 'monthly'];

// 매일 반복은 오래 앱을 안 열었을 때 폭주하지 않도록 최근 N일치만 소급 생성한다.
export const DAILY_CATCHUP_DAYS = 14;

export function isRecurrenceFrequency(v: unknown): v is RecurrenceFrequency {
  return typeof v === 'string' && (FREQUENCIES as string[]).includes(v);
}

// 시리즈로부터 특정 마감일의 회차(Todo) 하나를 만든다.
export function makeTodoFromSeries(series: RecurrenceSeries, dueDate: string): Todo {
  return {
    id: generateId(),
    text: series.text,
    completed: false,
    priority: series.priority,
    dueDate,
    category: series.category,
    createdAt: new Date().toISOString(),
    subtasks: series.subtasksTemplate && series.subtasksTemplate.length > 0
      ? series.subtasksTemplate.map(t => ({ id: generateId(), text: t, completed: false }))
      : undefined,
    memoIds: series.memoIds && series.memoIds.length > 0 ? [...series.memoIds] : undefined,
    seriesId: series.id,
  };
}

export interface MaterializeResult {
  newTodos: Todo[];
  nextSeries: RecurrenceSeries[];
  changed: boolean;
}

// active 시리즈들을 훑어, 오늘(today)까지 도래한 회차 중 아직 없는 것을 생성한다.
// - 이전 회차 완료 여부와 무관하게, 예정일이 되면 만든다.
// - 같은 seriesId + dueDate 조합이 이미 있으면 건너뛴다.
// - endDate를 지나면 시리즈를 'ended'로 전환한다.
export function materializeDueOccurrences(
  seriesList: RecurrenceSeries[],
  todos: Todo[],
  today: string
): MaterializeResult {
  const newTodos: Todo[] = [];
  let changed = false;

  const nextSeries = seriesList.map(series => {
    if (series.status !== 'active') return series;

    let scanEnd = today;
    if (series.endDate && series.endDate < scanEnd) scanEnd = series.endDate;

    const from = series.lastMaterializedDate
      ? addDaysStr(series.lastMaterializedDate, 1)
      : series.anchorDate;

    let updated = series;

    if (from <= scanEnd) {
      let effectiveFrom = from;
      if (series.frequency === 'daily') {
        const capStart = addDaysStr(today, -(DAILY_CATCHUP_DAYS - 1));
        if (effectiveFrom < capStart) effectiveFrom = capStart;
      }

      const dates = occurrencesInRange(series.anchorDate, series.frequency, effectiveFrom, scanEnd);
      for (const d of dates) {
        const exists =
          todos.some(t => t.seriesId === series.id && t.dueDate === d) ||
          newTodos.some(t => t.seriesId === series.id && t.dueDate === d);
        if (!exists) {
          newTodos.push(makeTodoFromSeries(series, d));
          changed = true;
        }
      }
      updated = { ...series, lastMaterializedDate: scanEnd };
      changed = true;
    }

    if (series.endDate && today > series.endDate) {
      updated = { ...updated, status: 'ended' };
      changed = true;
    }

    return updated;
  });

  return { newTodos, nextSeries, changed };
}

export interface MigrateResult {
  todos: Todo[];
  series: RecurrenceSeries[];
  changed: boolean;
}

// 레거시 데이터(할 일에 recurrence가 직접 박혀 있고 sourceId로 체인이 연결된 형태)를
// RecurrenceSeries + seriesId 구조로 1회 전환한다. 이미 seriesId가 있는 항목은 건드리지 않는다.
export function migrateLegacyRecurrence(todos: Todo[], series: RecurrenceSeries[]): MigrateResult {
  const hasLegacy = todos.some(
    t => t.recurrence && t.recurrence !== 'none' && !t.seriesId
  );
  if (!hasLegacy) return { todos, series, changed: false };

  const byId = new Map(todos.map(t => [t.id, t]));
  const nextSeries: RecurrenceSeries[] = [...series];
  const idToSeriesId = new Map<string, string>();

  for (const root of todos) {
    if (!root.recurrence || root.recurrence === 'none' || root.seriesId) continue;
    if (idToSeriesId.has(root.id)) continue;
    // 체인의 뿌리 = sourceId가 없거나, 그 부모가 목록에 없는 항목
    const isRoot = !root.sourceId || !byId.has(root.sourceId);
    if (!isRoot) continue;

    // sourceId 링크를 따라 자손을 모은다
    const chain: Todo[] = [root];
    let grew = true;
    while (grew) {
      grew = false;
      for (const c of todos) {
        if (c.seriesId || idToSeriesId.has(c.id)) continue;
        if (chain.includes(c)) continue;
        if (c.sourceId && chain.some(m => m.id === c.sourceId)) {
          chain.push(c);
          grew = true;
        }
      }
    }

    const dueDates = chain.map(m => m.dueDate).filter((d): d is string => !!d).sort();
    const anchorDate = root.dueDate || root.createdAt?.slice(0, 10) || dueDates[0];
    if (!anchorDate) continue;

    const sid = generateId();
    nextSeries.push({
      id: sid,
      text: root.text,
      category: root.category,
      priority: root.priority,
      frequency: root.recurrence,
      anchorDate,
      subtasksTemplate: root.subtasks && root.subtasks.length > 0
        ? root.subtasks.map(s => s.text)
        : undefined,
      memoIds: root.memoIds && root.memoIds.length > 0 ? [...root.memoIds] : undefined,
      status: 'active',
      lastMaterializedDate: dueDates.length > 0 ? dueDates[dueDates.length - 1] : undefined,
      createdAt: new Date().toISOString(),
    });
    for (const m of chain) idToSeriesId.set(m.id, sid);
  }

  if (idToSeriesId.size === 0) return { todos, series, changed: false };

  const migratedTodos = todos.map(t => {
    const sid = idToSeriesId.get(t.id);
    if (!sid) return t;
    // 레거시 반복 필드는 걷어내고 seriesId로만 연결
    const rest = { ...t };
    delete rest.recurrence;
    delete rest.sourceId;
    delete rest.recurrenceGenerated;
    rest.seriesId = sid;
    return rest;
  });

  return { todos: migratedTodos, series: nextSeries, changed: true };
}

export function validateRecurrenceSeries(incoming: unknown): RecurrenceSeries[] | null {
  if (!Array.isArray(incoming)) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ok = incoming.every((o: any) =>
    o && typeof o.id === 'string' && typeof o.text === 'string' &&
    isRecurrenceFrequency(o.frequency) && typeof o.anchorDate === 'string'
  );
  if (!ok) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return incoming.map((o: any) => ({
    id: o.id,
    text: o.text,
    category: typeof o.category === 'string' ? o.category : '기본',
    priority: ['low', 'medium', 'high'].includes(o.priority) ? o.priority : 'medium',
    frequency: o.frequency,
    anchorDate: o.anchorDate,
    subtasksTemplate: Array.isArray(o.subtasksTemplate)
      ? o.subtasksTemplate.filter((s: unknown) => typeof s === 'string')
      : undefined,
    memoIds: Array.isArray(o.memoIds)
      ? o.memoIds.filter((m: unknown) => typeof m === 'string')
      : undefined,
    endDate: typeof o.endDate === 'string' ? o.endDate : undefined,
    status: o.status === 'ended' ? 'ended' : 'active',
    lastMaterializedDate: typeof o.lastMaterializedDate === 'string' ? o.lastMaterializedDate : undefined,
    createdAt: typeof o.createdAt === 'string' ? o.createdAt : new Date().toISOString(),
  }));
}
