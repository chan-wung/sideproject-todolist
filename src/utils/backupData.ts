import type { Todo, CompletionLogEntry, RecurrenceSeries } from '../types/todo';
import type { Memo } from '../types/memo';
import { validateTodos, validateCompletionLog } from './todoData';
import { validateMemos } from './memoData';
import { validateRecurrenceSeries } from './recurrence';
import { validateWeeklyReportData, type WeeklyReportData } from './weeklyReportData';

// 지금 앱이 내보내고 읽을 수 있는 백업 형식 버전. version이 없는 옛 파일(배열 포함)도 읽는다.
export const BACKUP_VERSION = 1;

// 이 앱보다 새로운 버전에서 만든 백업인지 (읽으면 새 항목을 잃을 수 있어 거부한다)
export function isUnsupportedBackupVersion(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
  const v = (raw as Record<string, unknown>).version;
  return v !== undefined && !(typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= BACKUP_VERSION);
}

// 가져오기 확인창에 보여 줄 구역별 건수. 파일에 있던 구역만 나오며, 그 구역은 현재 데이터를 교체한다.
export function summarizeBackup(backup: ParsedBackup): string[] {
  const lines: string[] = [];
  if (backup.todos) lines.push(`할 일 ${backup.todos.length}건`);
  if (backup.memos) lines.push(`메모 ${backup.memos.length}건`);
  if (backup.completionLog) lines.push(`완료 이력 ${backup.completionLog.length}건`);
  if (backup.recurrenceSeries) lines.push(`반복 일정 ${backup.recurrenceSeries.length}건`);
  if (backup.weeklyReports) lines.push(`주간보고 저장본 ${Object.keys(backup.weeklyReports.drafts).length}건 · 복사 기록 ${backup.weeklyReports.copiedWeeks.length}건`);
  return lines;
}

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
  if (isUnsupportedBackupVersion(raw)) return null;

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
