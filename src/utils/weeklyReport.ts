import type { Todo, CompletionLogEntry, TodoKind } from '../types/todo';
import { addDaysStr, endOfWeek, formatReportDate, toLocalDateStr, weekOfMonthLabel } from './date';
import { normalizeKind } from './kind';

// 주간보고 양식 (엑셀 한 칸에 들어가는 여러 줄):
//   2026.11.2 바이러스 검사 완료      ← 날짜가 붙는 줄: 정기 업무(완료일), 연차·휴가(그 날짜)
//   2026.11.4 연차
//   (빈 줄)
//   [춘천시청] 유지보수(홈페이지 수정요청)   ← 일반 업무: [프로젝트] 내용, 날짜 없음

// 프로젝트를 따로 정하지 않았을 때 들어가는 기본값. 보고서에서는 대괄호를 붙이지 않는다.
const DEFAULT_CATEGORY = '기본';

export interface WeeklyReport {
  weekStart: string; // 월요일 YYYY-MM-DD
  weekEnd: string;   // 일요일 YYYY-MM-DD
  label: string;     // 예: '11월 1주'
  dateLines: string[];
  projectLines: string[];
  text: string;
  isEmpty: boolean;
}

export interface ReportItem {
  id: string;
  text: string;
  category: string;
  kind: TodoKind;
  doneAt: string;     // 완료 시각 (정렬용 원본 문자열)
  doneDate: string;   // 완료한 날짜 YYYY-MM-DD (로컬)
  dueDate?: string;
  completed: boolean;
}

// 줄바꿈이 섞인 제목도 보고서 한 줄로 만든다 (엑셀 칸 안에서 줄 구조가 깨지지 않게).
function oneLine(text: string): string {
  return text.replace(/\s*\n\s*/g, ' ').trim();
}

function fromTodo(t: Todo): ReportItem {
  const doneAt = t.completedAt ?? t.createdAt;
  return {
    id: t.id,
    text: oneLine(t.text),
    category: t.category,
    kind: normalizeKind(t.kind),
    doneAt,
    doneDate: toLocalDateStr(doneAt),
    dueDate: t.dueDate,
    completed: t.completed,
  };
}

function fromLog(e: CompletionLogEntry): ReportItem {
  return {
    id: e.id,
    text: oneLine(e.text),
    category: e.category,
    kind: normalizeKind(e.kind),
    doneAt: e.completedAt,
    doneDate: toLocalDateStr(e.completedAt),
    dueDate: e.dueDate,
    completed: true, // 완료 이력에 있다는 것 자체가 완료
  };
}

function inWeek(date: string | undefined, weekStart: string, weekEnd: string): boolean {
  return !!date && date >= weekStart && date <= weekEnd;
}

function routineLine(item: ReportItem): string {
  const done = item.text.endsWith('완료') ? item.text : `${item.text} 완료`;
  return `${formatReportDate(item.doneDate)} ${done}`;
}

function taskLine(item: ReportItem): string {
  const cat = item.category.trim();
  return cat && cat !== DEFAULT_CATEGORY ? `[${cat}] ${item.text}` : item.text;
}

// 완료 상태로 남아 있는 할 일 + 완료 이력을 하나로 모은다 (같은 id는 할 일 쪽을 우선).
// 주간보고와 대시보드가 같은 "완료한 일" 기준을 쓰도록 여기서 한 번만 만든다.
export function collectReportItems(todos: Todo[], completionLog: CompletionLogEntry[]): ReportItem[] {
  const byId = new Map<string, ReportItem>();
  for (const e of completionLog) byId.set(e.id, fromLog(e));
  for (const t of todos) byId.set(t.id, fromTodo(t)); // 같은 id면 할 일이 최신
  return [...byId.values()];
}

// weekStart(월요일)부터 일요일까지의 주간보고를 만든다.
// - 대상: 완료 상태로 남아 있는 할 일 + 완료 이력 (같은 id는 할 일 쪽을 우선)
// - 연차·휴가는 완료 여부와 상관없이 날짜(dueDate)가 그 주에 있으면 넣는다.
export function buildWeeklyReport(input: {
  weekStart: string;
  todos: Todo[];
  completionLog: CompletionLogEntry[];
}): WeeklyReport {
  const { weekStart, todos, completionLog } = input;
  const weekEnd = endOfWeek(weekStart);

  const items = collectReportItems(todos, completionLog);

  const dated: { date: string; order: string; line: string }[] = [];
  const tasks: { order: string; key: string; line: string }[] = [];

  for (const item of items) {
    if (item.kind === 'leave') {
      if (inWeek(item.dueDate, weekStart, weekEnd)) {
        dated.push({ date: item.dueDate!, order: item.doneAt, line: `${formatReportDate(item.dueDate!)} ${item.text}` });
      }
      continue;
    }
    if (!item.completed || !inWeek(item.doneDate, weekStart, weekEnd)) continue;

    if (item.kind === 'routine') {
      dated.push({ date: item.doneDate, order: item.doneAt, line: routineLine(item) });
    } else {
      const line = taskLine(item);
      tasks.push({ order: item.doneAt, key: line, line });
    }
  }

  dated.sort((a, b) => a.date.localeCompare(b.date) || a.order.localeCompare(b.order));
  tasks.sort((a, b) => a.order.localeCompare(b.order));

  const dateLines = [...new Set(dated.map(d => d.line))];
  const projectLines = [...new Set(tasks.map(t => t.line))];

  const text = [
    ...dateLines,
    ...(dateLines.length > 0 && projectLines.length > 0 ? [''] : []),
    ...projectLines,
  ].join('\n');

  return {
    weekStart,
    weekEnd,
    label: weekOfMonthLabel(weekStart),
    dateLines,
    projectLines,
    text,
    isEmpty: dateLines.length === 0 && projectLines.length === 0,
  };
}

// 이전·다음 주의 월요일
export function shiftWeek(weekStart: string, weeks: number): string {
  return addDaysStr(weekStart, weeks * 7);
}
