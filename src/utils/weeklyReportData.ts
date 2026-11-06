import { isValidDateStr, startOfWeek } from './date';

// 주간보고 저장 데이터(주별 수동 편집본, 복사 완료 기록)의 모양과 검증.
export interface WeeklyReportData {
  drafts: Record<string, string>;
  copiedWeeks: string[];
}

// 주 키는 달력에 실제로 있는 월요일이어야 한다 (화면이 월요일 키로만 찾으므로 다른 요일 키는 접근할 수 없는 글이 된다).
// 잘못된 키를 다른 주로 합치거나 몰래 버리지 않고 데이터 전체를 거부한다.
const isWeekStart = (value: unknown): value is string => isValidDateStr(value) && startOfWeek(value) === value;

export function validateWeeklyReportData(raw: unknown): WeeklyReportData | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const value = raw as Record<string, unknown>;
  if (!value.drafts || typeof value.drafts !== 'object' || Array.isArray(value.drafts) || !Array.isArray(value.copiedWeeks)) return null;
  const drafts = value.drafts as Record<string, unknown>;
  if (!Object.entries(drafts).every(([week, text]) => isWeekStart(week) && typeof text === 'string')) return null;
  if (!value.copiedWeeks.every(isWeekStart)) return null;
  return { drafts: drafts as Record<string, string>, copiedWeeks: [...new Set(value.copiedWeeks)] };
}
