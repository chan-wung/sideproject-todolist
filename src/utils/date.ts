const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseLocalDate(dateStr: string): Date {
  if (dateStr.includes('T')) {
    return new Date(dateStr);
  }
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    return new Date(y, m, d);
  }
  return new Date(dateStr);
}

export function isOverdue(dueDate?: string): boolean {
  if (!dueDate) return false;
  return parseLocalDate(dueDate) < new Date(new Date().toDateString());
}
export function isToday(dueDate?: string): boolean {
  if (!dueDate) return false;
  return parseLocalDate(dueDate).toDateString() === new Date().toDateString();
}
export function isThisWeek(dueDate?: string): boolean {
  if (!dueDate) return false;
  const d = new Date(parseLocalDate(dueDate).toDateString()).getTime();
  const today = new Date(new Date().toDateString()).getTime();
  return d >= today && d <= today + 7 * MS_PER_DAY;
}
export function formatDate(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export function formatTime(dateStr: string): string {
  const d = parseLocalDate(dateStr);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function formatYmd(y: number, m1: number, d: number): string {
  return `${y}-${String(m1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function todayStr(): string {
  const d = new Date();
  return formatYmd(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

// 해당 연·월(month0: 0=1월)의 마지막 날짜(28~31)
export function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}

// dateStr에 n일을 더한 날짜 문자열. n은 음수 가능.
export function addDaysStr(dateStr: string, n: number): string {
  const base = parseLocalDate(dateStr);
  base.setDate(base.getDate() + n);
  return formatYmd(base.getFullYear(), base.getMonth() + 1, base.getDate());
}

// dateStr에 n개월을 더하되, 대상 월에 그 날짜가 없으면 말일로 맞춘다.
// (예: 2026-01-31 +1개월 → 2026-02-28, 다음 달로 넘치지 않음)
export function addMonthsClamped(dateStr: string, n: number): string {
  const parts = dateStr.split('-');
  const y = parseInt(parts[0], 10);
  const m0 = parseInt(parts[1], 10) - 1;
  const d = parseInt(parts[2], 10);
  const total = y * 12 + m0 + n;
  const ny = Math.floor(total / 12);
  const nm0 = ((total % 12) + 12) % 12;
  const nd = Math.min(d, daysInMonth(ny, nm0));
  return formatYmd(ny, nm0 + 1, nd);
}

// anchorDate를 기준으로 n번째 회차 날짜(n=0이면 anchorDate 자신).
export function nthOccurrence(anchorDate: string, frequency: 'daily' | 'weekly' | 'monthly', n: number): string {
  if (frequency === 'daily') return addDaysStr(anchorDate, n);
  if (frequency === 'weekly') return addDaysStr(anchorDate, n * 7);
  return addMonthsClamped(anchorDate, n);
}

// n번째 회차부터 대략적으로 탐색을 시작할 인덱스 추정치 (넉넉하게 이전으로 잡아 while 루프가 채워 나감).
function estimateStartIndex(anchorDate: string, frequency: 'daily' | 'weekly' | 'monthly', fromDate: string): number {
  if (fromDate <= anchorDate) return 0;
  const a = parseLocalDate(anchorDate);
  const f = parseLocalDate(fromDate);
  const dayDiff = Math.floor((f.getTime() - a.getTime()) / MS_PER_DAY);
  if (frequency === 'daily') return Math.max(0, dayDiff - 1);
  if (frequency === 'weekly') return Math.max(0, Math.floor(dayDiff / 7) - 1);
  const monthDiff = (f.getFullYear() - a.getFullYear()) * 12 + (f.getMonth() - a.getMonth());
  return Math.max(0, monthDiff - 1);
}

// [fromDate, toDate] 범위에 드는 회차 날짜 목록 (오름차순). anchorDate 이전은 포함하지 않음.
export function occurrencesInRange(
  anchorDate: string,
  frequency: 'daily' | 'weekly' | 'monthly',
  fromDate: string,
  toDate: string,
  maxCount = 500
): string[] {
  const result: string[] = [];
  if (toDate < anchorDate || toDate < fromDate) return result;
  let n = estimateStartIndex(anchorDate, frequency, fromDate);
  // 추정치가 너무 앞서 있을 수 있으니 fromDate 위로 올라올 때까지 전진
  while (result.length < maxCount) {
    const d = nthOccurrence(anchorDate, frequency, n);
    if (d > toDate) break;
    if (d >= fromDate && d >= anchorDate) result.push(d);
    n++;
  }
  return result;
}

// 미리보기용: fromDate 이후로 다가오는 회차 count개.
export function upcomingOccurrences(
  anchorDate: string,
  frequency: 'daily' | 'weekly' | 'monthly',
  fromDate: string,
  count: number,
  endDate?: string
): string[] {
  const result: string[] = [];
  let n = estimateStartIndex(anchorDate, frequency, fromDate);
  let guard = 0;
  while (result.length < count && guard < 5000) {
    guard++;
    const d = nthOccurrence(anchorDate, frequency, n);
    n++;
    if (d < fromDate || d < anchorDate) continue;
    if (endDate && d > endDate) break;
    result.push(d);
  }
  return result;
}

export interface YearProgress {
  year: number;
  daysLeft: number;
  percent: number;
  totalDays: number;
}

// 올해 남은 날(오늘 제외, 12/31이면 0)과 경과율(0~100, 정수 내림)
export function yearProgress(now: Date = new Date()): YearProgress {
  const year = now.getFullYear();
  const today = new Date(year, now.getMonth(), now.getDate());
  const start = new Date(year, 0, 1);
  const nextStart = new Date(year + 1, 0, 1);
  const totalDays = Math.round((nextStart.getTime() - start.getTime()) / MS_PER_DAY);
  const passed = Math.round((today.getTime() - start.getTime()) / MS_PER_DAY) + 1;
  return {
    year,
    daysLeft: totalDays - passed,
    percent: Math.floor((passed / totalDays) * 100),
    totalDays,
  };
}

export function calculateNextRecurrence(dateStr?: string, rule?: 'none' | 'daily' | 'weekly' | 'monthly'): string | undefined {
  if (!rule || rule === 'none') return undefined;
  const base = dateStr ? parseLocalDate(dateStr) : new Date();
  const baseStr = formatYmd(base.getFullYear(), base.getMonth() + 1, base.getDate());
  if (rule === 'daily') return addDaysStr(baseStr, 1);
  if (rule === 'weekly') return addDaysStr(baseStr, 7);
  return addMonthsClamped(baseStr, 1);
}
