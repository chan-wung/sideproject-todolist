import type { Todo, CompletionLogEntry, TodoKind } from '../types/todo';
import { addDaysStr, endOfWeek, formatReportDate, toLocalDateStr, weekOfMonthLabel } from './date';
import { normalizeKind } from './kind';

// 주간보고 양식 (엑셀 한 칸에 들어가는 여러 줄):
//   2026.11.2 바이러스 검사 완료      ← 날짜가 붙는 줄: 정기 업무(완료일), 연차·휴가(그 날짜)
//   2026.11.4 연차
//   (빈 줄)
//   [춘천시청] 유지보수(홈페이지 수정요청)   ← 일반 업무: [프로젝트] 내용, 날짜 없음
//   - 메인 배너 교체                          ← 하위 항목이 있으면 그 줄 아래에 '- 내용'으로 이어 붙인다(끌 수 있음)

// 프로젝트를 따로 정하지 않았을 때 들어가는 기본값. 보고서에서는 대괄호를 붙이지 않는다.
const DEFAULT_CATEGORY = '기본';

export interface WeeklyReport {
  weekStart: string; // 월요일 YYYY-MM-DD
  weekEnd: string;   // 일요일 YYYY-MM-DD
  label: string;     // 예: '11월 1주'
  /** 날짜가 붙는 덩어리들. 하위 항목이 있으면 한 덩어리가 여러 줄('제목\n- 하위')이다 */
  dateLines: string[];
  /** [프로젝트] 내용 덩어리들 (dateLines와 같은 모양) */
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
  /** 하위 항목의 글 (한 줄로 정리됨, 빈 것은 뺌) */
  subtasks: string[];
}

// 줄바꿈이 섞인 제목도 보고서 한 줄로 만든다 (엑셀 칸 안에서 줄 구조가 깨지지 않게).
function oneLine(text: string): string {
  return text.replace(/\s*\n\s*/g, ' ').trim();
}

function cleanSubtasks(subtasks: { text: string }[] | undefined): string[] {
  return (subtasks ?? []).map(sub => oneLine(sub.text)).filter(Boolean);
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
    subtasks: cleanSubtasks(t.subtasks),
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
    subtasks: cleanSubtasks(e.subtasks),
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

// 같은 줄(제목)은 한 덩어리로 합치고, 하위 항목은 겹치는 것 없이 합쳐 제목 아래에 '- 내용'으로 붙인다.
function groupLines(entries: { line: string; subs: string[] }[], includeSubtasks: boolean): string[] {
  const groups = new Map<string, string[]>();
  for (const { line, subs } of entries) {
    const merged = groups.get(line) ?? [];
    if (includeSubtasks) for (const sub of subs) if (!merged.includes(sub)) merged.push(sub);
    groups.set(line, merged);
  }
  return [...groups].map(([line, subs]) => [line, ...subs.map(sub => `- ${sub}`)].join('\n'));
}

// weekStart(월요일)부터 일요일까지의 주간보고를 만든다.
// - 대상: 완료 상태로 남아 있는 할 일 + 완료 이력 (같은 id는 할 일 쪽을 우선)
// - 연차·휴가는 완료 여부와 상관없이 날짜(dueDate)가 그 주에 있으면 넣는다.
// - includeSubtasks(기본 true)이면 하위 항목도 제목 아래에 함께 넣는다.
export function buildWeeklyReport(input: {
  weekStart: string;
  todos: Todo[];
  completionLog: CompletionLogEntry[];
  includeSubtasks?: boolean;
}): WeeklyReport {
  const { weekStart, todos, completionLog, includeSubtasks = true } = input;
  const weekEnd = endOfWeek(weekStart);

  const items = collectReportItems(todos, completionLog);

  const dated: { date: string; order: string; line: string; subs: string[] }[] = [];
  const tasks: { order: string; line: string; subs: string[] }[] = [];

  for (const item of items) {
    if (item.kind === 'leave') {
      if (inWeek(item.dueDate, weekStart, weekEnd)) {
        dated.push({ date: item.dueDate!, order: item.doneAt, line: `${formatReportDate(item.dueDate!)} ${item.text}`, subs: [] }); // 연차는 이름·시각·사유가 제목에 다 들어 있다
      }
      continue;
    }
    if (!item.completed || !inWeek(item.doneDate, weekStart, weekEnd)) continue;

    if (item.kind === 'routine') {
      dated.push({ date: item.doneDate, order: item.doneAt, line: routineLine(item), subs: item.subtasks });
    } else {
      tasks.push({ order: item.doneAt, line: taskLine(item), subs: item.subtasks });
    }
  }

  dated.sort((a, b) => a.date.localeCompare(b.date) || a.order.localeCompare(b.order));
  tasks.sort((a, b) => a.order.localeCompare(b.order));

  const dateLines = groupLines(dated, includeSubtasks);
  const projectLines = groupLines(tasks, includeSubtasks);

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

// 그 주 보고를 아직 안 낸 것으로 볼지. 이미 복사한 주는 제외하고,
// 자동 생성 글이 비었어도 직접 쓴 글(비어 있지 않은 수동 저장본)이 있으면 보고할 내용이 있는 것으로 본다.
export function hasUnreportedWeek(input: {
  weekStart: string;
  todos: Todo[];
  completionLog: CompletionLogEntry[];
  drafts: Record<string, string>;
  copiedWeeks: string[];
}): boolean {
  const { weekStart, todos, completionLog, drafts, copiedWeeks } = input;
  if (copiedWeeks.includes(weekStart)) return false;
  if ((drafts[weekStart] ?? '').trim() !== '') return true;
  return !buildWeeklyReport({ weekStart, todos, completionLog }).isEmpty;
}
