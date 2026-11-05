import type { Todo, CompletionLogEntry, RecurrenceSeries } from '../types/todo';
import type { Memo } from '../hooks/useMemos';
import { validateTodos, validateCompletionLog } from './todoData';
import { validateMemos } from '../hooks/useMemos';
import { validateRecurrenceSeries } from './recurrence';
import { validateWeeklyReportData, type WeeklyReportData } from '../hooks/useWeeklyReports';

// 백업 파일에서 읽어 낸 구역들. 파일에 있던 구역만 값이 있다.
export interface ParsedBackup {
  todos?: Todo[];
  memos?: Memo[];
  completionLog?: CompletionLogEntry[];
  recurrenceSeries?: RecurrenceSeries[];
  weeklyReports?: WeeklyReportData;
}

// 백업 파일(JSON을 읽은 값)을 검증한다. 데이터를 덮어쓰는 경로라서 아래 순서를 지킨다.
// - 예전 형식(할 일 배열만)도 받는다.
// - 새 형식은 파일에 있는 구역(todos·memos·completionLog·recurrenceSeries)을 **모두 먼저 검증**하고,
//   하나라도 틀리면 null이다 (일부만 적용되는 일이 없도록).
// - 알려진 구역이 하나도 없으면 null이다.
export function parseBackup(raw: unknown): ParsedBackup | null {
  if (Array.isArray(raw)) {
    const todos = validateTodos(raw);
    return todos ? { todos } : null;
  }
  if (!raw || typeof raw !== 'object') return null;

  const p = raw as Record<string, unknown>;
  const result: ParsedBackup = {};

  if (p.todos !== undefined) {
    const todos = validateTodos(p.todos);
    if (!todos) return null;
    result.todos = todos;
  }
  if (p.memos !== undefined) {
    const memos = validateMemos(p.memos);
    if (!memos) return null;
    result.memos = memos;
  }
  if (p.completionLog !== undefined) {
    const log = validateCompletionLog(p.completionLog);
    if (!log) return null;
    result.completionLog = log;
  }
  if (p.recurrenceSeries !== undefined) {
    const series = validateRecurrenceSeries(p.recurrenceSeries);
    if (!series) return null;
    result.recurrenceSeries = series;
  }
  if (p.weeklyReports !== undefined) {
    const weeklyReports = validateWeeklyReportData(p.weeklyReports);
    if (!weeklyReports) return null;
    result.weeklyReports = weeklyReports;
  }

  return Object.keys(result).length > 0 ? result : null;
}
