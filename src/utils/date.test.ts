import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isToday, isOverdue, isThisWeek, formatDate, calculateNextRecurrence,
  addMonthsClamped, addDaysStr, nthOccurrence, occurrencesInRange, upcomingOccurrences,
  yearProgress, startOfWeek, endOfWeek, weekOfMonthLabel, formatReportDate, toLocalDateStr,
} from './date';

describe('yearProgress', () => {
  it('평년 1/1은 364일 남음', () => {
    const r = yearProgress(new Date(2026, 0, 1));
    expect(r.daysLeft).toBe(364);
    expect(r.totalDays).toBe(365);
  });

  it('윤년 1/1은 365일 남음', () => {
    const r = yearProgress(new Date(2028, 0, 1));
    expect(r.daysLeft).toBe(365);
    expect(r.totalDays).toBe(366);
  });

  it('12/31은 0일 남고 100%', () => {
    const r = yearProgress(new Date(2026, 11, 31, 23, 59));
    expect(r.daysLeft).toBe(0);
    expect(r.percent).toBe(100);
  });

  it('2026-11-03은 58일 남고 84%', () => {
    const r = yearProgress(new Date(2026, 10, 3, 15, 0));
    expect(r.daysLeft).toBe(58);
    expect(r.percent).toBe(84);
  });
});

describe('date utils', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-02T10:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('isToday', () => {
    expect(isToday('2026-07-02')).toBe(true);
    expect(isToday('2026-07-01')).toBe(false);
    expect(isToday('2026-07-03')).toBe(false);
    expect(isToday(undefined)).toBe(false);
  });

  it('isOverdue', () => {
    expect(isOverdue('2026-07-01')).toBe(true);
    expect(isOverdue('2026-07-02')).toBe(false);
    expect(isOverdue(undefined)).toBe(false);
  });

  it('isThisWeek', () => {
    expect(isThisWeek('2026-07-02')).toBe(true);
    expect(isThisWeek('2026-07-09')).toBe(true); // +7 days
    expect(isThisWeek('2026-07-10')).toBe(false); // +8 days
    expect(isThisWeek('2026-07-01')).toBe(false); // yesterday
  });

  it('formatDate', () => {
    expect(formatDate('2026-07-02')).toBe('2026.07.02');
    expect(formatDate('2026-07-02T10:00:00.000Z')).toBe('2026.07.02');
  });

  it('calculateNextRecurrence', () => {
    expect(calculateNextRecurrence('2026-07-02', 'daily')).toBe('2026-07-03');
    expect(calculateNextRecurrence('2026-07-02', 'weekly')).toBe('2026-07-09');
    expect(calculateNextRecurrence('2026-07-02', 'monthly')).toBe('2026-08-02');
    expect(calculateNextRecurrence('2026-07-02', 'none')).toBe(undefined);
    expect(calculateNextRecurrence('2026-07-02', undefined)).toBe(undefined);
    expect(calculateNextRecurrence(undefined, 'daily')).toBe('2026-07-03');

    // 월말 경계: 2월엔 31일이 없으므로 말일로 클램프 (다음 달로 넘치지 않음)
    expect(calculateNextRecurrence('2026-01-31', 'monthly')).toBe('2026-02-28');
  });

  it('addDaysStr', () => {
    expect(addDaysStr('2026-07-02', 1)).toBe('2026-07-03');
    expect(addDaysStr('2026-07-31', 1)).toBe('2026-08-01');
    expect(addDaysStr('2026-03-01', -1)).toBe('2026-02-28');
  });

  it('addMonthsClamped clamps to the last day of the target month', () => {
    expect(addMonthsClamped('2026-01-31', 1)).toBe('2026-02-28');
    expect(addMonthsClamped('2028-01-31', 1)).toBe('2028-02-29'); // 윤년
    expect(addMonthsClamped('2026-01-31', 2)).toBe('2026-03-31');
    expect(addMonthsClamped('2026-01-31', 3)).toBe('2026-04-30');
    expect(addMonthsClamped('2026-12-15', 1)).toBe('2027-01-15'); // 연도 넘어감
    expect(addMonthsClamped('2026-03-31', -1)).toBe('2026-02-28');
  });

  it('nthOccurrence steps from the anchor without drift', () => {
    // 매달 31일 반복: 각 회차는 anchor 기준으로 계산되어 밀리지 않음
    expect(nthOccurrence('2026-01-31', 'monthly', 0)).toBe('2026-01-31');
    expect(nthOccurrence('2026-01-31', 'monthly', 1)).toBe('2026-02-28');
    expect(nthOccurrence('2026-01-31', 'monthly', 2)).toBe('2026-03-31');
    expect(nthOccurrence('2026-07-02', 'weekly', 3)).toBe('2026-07-23');
    expect(nthOccurrence('2026-07-02', 'daily', 10)).toBe('2026-07-12');
  });

  it('occurrencesInRange returns only dates within [from, to]', () => {
    expect(occurrencesInRange('2026-07-24', 'monthly', '2026-07-25', '2026-10-01'))
      .toEqual(['2026-08-24', '2026-09-24']);
    // anchor 이전은 포함하지 않음
    expect(occurrencesInRange('2026-07-24', 'monthly', '2026-01-01', '2026-08-24'))
      .toEqual(['2026-07-24', '2026-08-24']);
    expect(occurrencesInRange('2026-07-24', 'weekly', '2026-07-24', '2026-08-14'))
      .toEqual(['2026-07-24', '2026-07-31', '2026-08-07', '2026-08-14']);
  });

  it('upcomingOccurrences previews the next N dates from a given day', () => {
    expect(upcomingOccurrences('2026-07-24', 'monthly', '2026-08-01', 3))
      .toEqual(['2026-08-24', '2026-09-24', '2026-10-24']);
    // endDate 이후로는 멈춤
    expect(upcomingOccurrences('2026-07-24', 'monthly', '2026-08-01', 3, '2026-09-30'))
      .toEqual(['2026-08-24', '2026-09-24']);
  });
});

describe('주간보고용 날짜 함수', () => {
  it('startOfWeek: 어느 요일이든 그 주 월요일을 돌려주고, 일요일은 그 주의 마지막 날이다', () => {
    expect(startOfWeek('2026-11-02')).toBe('2026-11-02'); // 월
    expect(startOfWeek('2026-11-04')).toBe('2026-11-02'); // 수
    expect(startOfWeek('2026-11-08')).toBe('2026-11-02'); // 일
    expect(startOfWeek('2026-11-09')).toBe('2026-11-09'); // 다음 월
  });

  it('startOfWeek: 달·해가 바뀌어도 맞다', () => {
    expect(startOfWeek('2026-12-01')).toBe('2026-11-30');
    expect(startOfWeek('2027-01-01')).toBe('2026-12-28');
  });

  it('endOfWeek: 월요일에서 6일 뒤(일요일)', () => {
    expect(endOfWeek('2026-11-02')).toBe('2026-11-08');
    expect(endOfWeek('2026-10-26')).toBe('2026-11-01');
  });

  it('weekOfMonthLabel: 월요일이 속한 달의 N번째 월요일', () => {
    expect(weekOfMonthLabel('2026-10-19')).toBe('10월 3주');
    expect(weekOfMonthLabel('2026-10-26')).toBe('10월 4주');
    expect(weekOfMonthLabel('2026-11-02')).toBe('11월 1주');
    expect(weekOfMonthLabel('2026-11-30')).toBe('11월 5주');
  });

  it('formatReportDate: 월·일에 0을 붙이지 않는다', () => {
    expect(formatReportDate('2026-11-02')).toBe('2026.11.2');
    expect(formatReportDate('2026-10-26')).toBe('2026.10.26');
    expect(formatReportDate('2026-01-05')).toBe('2026.1.5');
  });

  it('toLocalDateStr: 로컬 시각·날짜를 로컬 날짜로, 해석 불가면 빈 문자열', () => {
    expect(toLocalDateStr('2026-11-03')).toBe('2026-11-03');
    expect(toLocalDateStr('2026-11-03T23:59:00')).toBe('2026-11-03');
    expect(toLocalDateStr(new Date(2026, 10, 3, 0, 30).toISOString())).toBe('2026-11-03');
    expect(toLocalDateStr('엉터리')).toBe('');
  });
});
