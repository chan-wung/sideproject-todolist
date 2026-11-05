import { describe, it, expect } from 'vitest';
import { layoutTimed, layoutWeek, sundayWeekDates, type CalendarItem } from './calendar';
import { leaveTimeRange } from './leave';

// 업체·업무 이름은 모두 가상의 이름이다.
function item(overrides: Partial<CalendarItem> = {}): CalendarItem {
  return {
    key: Math.random().toString(36).slice(2),
    text: '업무',
    kind: 'task',
    category: '기본',
    priority: 'medium',
    completed: false,
    upcoming: false,
    logged: false,
    start: '2026-11-04',
    end: '2026-11-04',
    ...overrides,
  };
}

describe('leaveTimeRange', () => {
  it('시간 연차 제목에서 시각을 읽는다 (사유가 붙어도 된다)', () => {
    expect(leaveTimeRange('연차 14:00~15:30')).toEqual({ start: '14:00', end: '15:30' });
    expect(leaveTimeRange('연차 09:00~12:00 (병원 진료)')).toEqual({ start: '09:00', end: '12:00' });
  });

  it('시각이 없거나 맞지 않으면 null이다', () => {
    expect(leaveTimeRange('연차')).toBeNull();
    expect(leaveTimeRange('오전 반차 (병원)')).toBeNull();
    expect(leaveTimeRange('병가 10:00~11:00')).toBeNull();
    expect(leaveTimeRange('연차 15:00~14:00')).toBeNull();
    expect(leaveTimeRange('연차 25:00~26:00')).toBeNull();
  });
});

describe('sundayWeekDates', () => {
  it('일요일부터 토요일까지 7개 날짜를 돌려준다', () => {
    expect(sundayWeekDates('2026-11-04')).toEqual([
      '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06', '2026-11-07',
    ]);
  });

  it('일요일·토요일을 넣어도 같은 주다', () => {
    expect(sundayWeekDates('2026-11-01')[0]).toBe('2026-11-01');
    expect(sundayWeekDates('2026-11-07')[0]).toBe('2026-11-01');
  });

  it('달과 해가 바뀌는 주도 이어진다', () => {
    expect(sundayWeekDates('2026-12-31')).toEqual([
      '2026-12-27', '2026-12-28', '2026-12-29', '2026-12-30', '2026-12-31', '2027-01-01', '2027-01-02',
    ]);
  });
});

describe('layoutWeek', () => {
  const week = sundayWeekDates('2026-11-04');

  it('주 안에서 겹치지 않게 줄을 나누고, 줄이 모자라면 hidden에 센다', () => {
    const items = [item({ key: 'a' }), item({ key: 'b' }), item({ key: 'c' })];
    const res = layoutWeek(items, week, 2);
    expect(res.bars.map(b => b.lane)).toEqual([0, 1]);
    expect(res.total['2026-11-04']).toBe(3);
    expect(res.hidden['2026-11-04']).toBe(1);
  });

  it('줄 수 제한을 크게 주면 모두 그린다', () => {
    const items = [item(), item(), item(), item(), item()];
    expect(layoutWeek(items, week, Number.MAX_SAFE_INTEGER).bars).toHaveLength(5);
  });

  it('주를 넘는 기간은 이 주 안쪽만 자르고 이어짐을 표시한다', () => {
    const [bar] = layoutWeek([item({ start: '2026-10-30', end: '2026-11-03' })], week).bars;
    expect(bar.col).toBe(1);
    expect(bar.span).toBe(3);
    expect(bar.continuesBefore).toBe(true);
    expect(bar.continuesAfter).toBe(false);
  });

  it('이 주에 걸치지 않는 항목은 넣지 않는다', () => {
    expect(layoutWeek([item({ start: '2026-11-10', end: '2026-11-10' })], week).bars).toHaveLength(0);
  });
});

describe('layoutTimed', () => {
  const leave = (text: string, key = text) => item({ key, text, kind: 'leave' });

  it('시각이 적힌 시간 연차만 시간 칸에 놓고 나머지는 종일로 보낸다', () => {
    const items = [
      leave('연차 14:00~15:00 (병원 진료)'),
      leave('오전 반차'),
      item({ text: '[가상구청] 보고서 작성' }),
    ];
    const { allDay, timed } = layoutTimed(items, '2026-11-04');
    expect(timed).toHaveLength(1);
    expect(timed[0].startMin).toBe(14 * 60);
    expect(timed[0].endMin).toBe(15 * 60);
    expect(allDay.map(i => i.text)).toEqual(['오전 반차', '[가상구청] 보고서 작성']);
  });

  it('그 날짜에 걸치지 않는 항목은 무시한다', () => {
    const { allDay, timed } = layoutTimed([leave('연차 10:00~11:00')], '2026-11-05');
    expect(allDay).toHaveLength(0);
    expect(timed).toHaveLength(0);
  });

  it('겹치는 시간 연차는 나란히 열을 나눠 갖는다', () => {
    const { timed } = layoutTimed([leave('연차 10:00~12:00'), leave('연차 11:00~13:00')], '2026-11-04');
    expect(timed.map(b => [b.column, b.columns])).toEqual([[0, 2], [1, 2]]);
  });

  it('겹치지 않으면 각자 한 열을 다 쓰고, 끝과 시작이 맞닿아도 겹친 것이 아니다', () => {
    const { timed } = layoutTimed([leave('연차 09:00~10:00'), leave('연차 10:00~11:00')], '2026-11-04');
    expect(timed.map(b => [b.column, b.columns])).toEqual([[0, 1], [0, 1]]);
  });
});
