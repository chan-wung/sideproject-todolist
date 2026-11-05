import type { Todo, CompletionLogEntry } from '../types/todo';
import { endOfWeek, startOfWeek, weekOfMonthLabel } from './date';
import { normalizeKind } from './kind';
import { collectReportItems, shiftWeek } from './weeklyReport';

export interface DashboardTodo {
  id: string;
  text: string;
  category: string;
  dueDate: string;
}

export interface DashboardStats {
  weekStart: string;
  weekEnd: string;
  weekLabel: string;
  /** 이번 주에 완료한 일 수 (일반 + 정기 업무. 연차·휴가는 제외) */
  completedThisWeek: number;
  completedLastWeek: number;
  /** 이번 주에 완료한 일의 카테고리별 개수 (많은 순, 같으면 이름순) */
  byCategory: { category: string; count: number }[];
  /** 최근 6주 완료 수 (오래된 주 → 이번 주) */
  trend: { weekStart: string; label: string; count: number }[];
  /** 진행 중(미완료)인 일 수 (연차·휴가 제외) */
  activeCount: number;
  /** 마감일이 오늘보다 앞선 미완료 (오래된 마감 순) */
  overdue: DashboardTodo[];
  dueToday: number;
  /** 오늘 이후 이번 주 일요일까지 마감인 미완료 */
  dueThisWeek: number;
  /** 이번 주(월~일) 안에 마감인데 아직 안 한 정기 업무 — 보고서에 빠질 수 있어 알려 준다 */
  pendingRoutines: DashboardTodo[];
  /** 이번 주의 연차·휴가 (날짜순) */
  leaveThisWeek: { date: string; text: string }[];
}

export const TREND_WEEKS = 6;

function inRange(date: string | undefined, from: string, to: string): boolean {
  return !!date && date >= from && date <= to;
}

function toDashboardTodo(t: Todo): DashboardTodo {
  return { id: t.id, text: t.text, category: t.category, dueDate: t.dueDate as string };
}

// 대시보드에 보여 줄 숫자를 계산한다.
// "완료한 일"은 주간보고와 같은 기준(완료 상태로 남은 할 일 + 완료 이력)을 쓴다.
export function buildDashboardStats(input: {
  todos: Todo[];
  completionLog: CompletionLogEntry[];
  today: string;
}): DashboardStats {
  const { todos, completionLog, today } = input;
  const weekStart = startOfWeek(today);
  const weekEnd = endOfWeek(weekStart);

  const done = collectReportItems(todos, completionLog).filter(i => i.completed && i.kind !== 'leave');
  const countIn = (from: string, to: string) => done.filter(i => inRange(i.doneDate, from, to)).length;

  const categoryCount = new Map<string, number>();
  for (const i of done) {
    if (!inRange(i.doneDate, weekStart, weekEnd)) continue;
    const category = i.category.trim() || '기본';
    categoryCount.set(category, (categoryCount.get(category) ?? 0) + 1);
  }
  const byCategory = [...categoryCount.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));

  const trend = Array.from({ length: TREND_WEEKS }, (_, n) => {
    const start = shiftWeek(weekStart, n - (TREND_WEEKS - 1));
    return { weekStart: start, label: weekOfMonthLabel(start), count: countIn(start, endOfWeek(start)) };
  });

  const open = todos.filter(t => !t.completed && normalizeKind(t.kind) !== 'leave');
  const overdue = open
    .filter(t => t.dueDate && t.dueDate < today)
    .sort((a, b) => (a.dueDate as string).localeCompare(b.dueDate as string))
    .map(toDashboardTodo);

  const pendingRoutines = todos
    .filter(t => !t.completed && normalizeKind(t.kind) === 'routine' && inRange(t.dueDate, weekStart, weekEnd))
    .sort((a, b) => (a.dueDate as string).localeCompare(b.dueDate as string))
    .map(toDashboardTodo);

  const leaveThisWeek = todos
    .filter(t => normalizeKind(t.kind) === 'leave' && inRange(t.dueDate, weekStart, weekEnd))
    .map(t => ({ date: t.dueDate as string, text: t.text }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return {
    weekStart,
    weekEnd,
    weekLabel: weekOfMonthLabel(weekStart),
    completedThisWeek: countIn(weekStart, weekEnd),
    completedLastWeek: countIn(shiftWeek(weekStart, -1), endOfWeek(shiftWeek(weekStart, -1))),
    byCategory,
    trend,
    activeCount: open.length,
    overdue,
    dueToday: open.filter(t => t.dueDate === today).length,
    dueThisWeek: open.filter(t => t.dueDate && t.dueDate > today && t.dueDate <= weekEnd).length,
    pendingRoutines,
    leaveThisWeek,
  };
}
