import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup, within } from '@testing-library/react';
import CalendarPage from './CalendarPage';
import type { Todo, RecurrenceSeries, CompletionLogEntry } from '../types/todo';

// 업체·업무 이름은 모두 가상의 이름이다. 오늘은 2026-11-04(수)로 고정.
function todo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: Math.random().toString(36).slice(2),
    text: '업무',
    completed: false,
    priority: 'medium',
    category: '기본',
    createdAt: '2026-10-30T09:00:00',
    dueDate: '2026-11-10',
    ...overrides,
  };
}

const ROUTINE_SERIES: RecurrenceSeries = {
  id: 's1', text: '바이러스 검사', category: '기본', priority: 'medium',
  frequency: 'weekly', anchorDate: '2026-11-02', kind: 'routine', status: 'active',
  createdAt: '2026-10-30T09:00:00',
};

function setup(todos: Todo[] = [], series: RecurrenceSeries[] = [], completionLog: CompletionLogEntry[] = []) {
  const utils = render(<CalendarPage todos={todos} series={series} completionLog={completionLog} />);
  const day = (n: number) => utils.getByRole('button', { name: new RegExp(`^\\d+월 ${n}일`) });
  const detail = () => utils.container.querySelector('.calendar__detail') as HTMLElement;
  // 띠는 날짜 칸 밖의 별도 층에 그려진다
  const bars = () => Array.from(utils.container.querySelectorAll<HTMLElement>('.calendar__bar'));
  const barTexts = () => bars().map(b => b.textContent);
  return { ...utils, day, detail, bars, barTexts };
}

describe('CalendarPage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-04T10:00:00'));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('화면 제목은 h1 하나다', () => {
    const { getAllByRole } = setup();
    const h1 = getAllByRole('heading', { level: 1 });
    expect(h1).toHaveLength(1);
    expect(h1[0].textContent).toBe('캘린더');
  });

  it('이번 달 달력을 그리고 오늘을 표시하며, 처음엔 오늘을 골라 둔다', () => {
    const { container, getByText, day, detail } = setup();
    expect(getByText('2026년 11월')).toBeTruthy();
    expect(Array.from(container.querySelectorAll('.calendar__head')).map(e => e.textContent)).toEqual(['일', '월', '화', '수', '목', '금', '토']);
    expect(container.querySelectorAll('.calendar__day')).toHaveLength(30);
    expect(day(4).getAttribute('aria-current')).toBe('date');
    expect(container.querySelectorAll('[aria-current="date"]')).toHaveLength(1);
    expect(day(4).getAttribute('aria-pressed')).toBe('true');
    expect(within(detail()).getByText('11월 4일 (수)')).toBeTruthy();
    expect(within(detail()).getByText('이 날은 등록된 일정이 없습니다.')).toBeTruthy();
  });

  it('마감일이 있는 항목을 띠로 보여 주고, 넘치면 날짜 칸에 +N으로 줄인다', () => {
    const { day, bars, barTexts } = setup([
      todo({ text: '일 하나', dueDate: '2026-11-10' }),
      todo({ text: '일 둘', dueDate: '2026-11-10' }),
      todo({ text: '일 셋', dueDate: '2026-11-10' }),
      todo({ text: '일 넷', dueDate: '2026-11-10' }),
      todo({ text: '다른 날', dueDate: '2026-11-11' }),
    ]);
    const ten = day(10);
    expect(ten.getAttribute('aria-label')).toBe('11월 10일, 일정 4개');
    expect(barTexts().filter(t => /^일 (하나|둘|셋|넷)$/.test(t ?? ''))).toHaveLength(3);
    expect(bars()).toHaveLength(4); // 10일 3줄 + 11일 1줄
    expect(within(ten).getByText('+1')).toBeTruthy();
    expect(day(11).getAttribute('aria-label')).toBe('11월 11일, 일정 1개');
    expect(day(12).getAttribute('aria-label')).toBe('11월 12일'); // 일정이 없으면 개수를 덧붙이지 않는다
  });

  it('띠는 보조 기술에 읽히지 않고(칸의 aria-label이 대신 알린다) 클릭을 가로채지 않는다', () => {
    const { container } = setup([todo({ text: '띠 업무', dueDate: '2026-11-10' })]);
    const layer = container.querySelector('.calendar__bars') as HTMLElement;
    expect(layer.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('.calendar__day')?.contains(container.querySelector('.calendar__bar'))).toBe(false);
  });

  it('기간이 있는 항목은 시작일부터 마감일까지 한 줄 띠로 이어지고, 주를 넘으면 주마다 이어 그린다', () => {
    const { bars, day } = setup([todo({ text: '긴 업무', startDate: '2026-11-05', dueDate: '2026-11-11' })]); // 목 ~ 다음 주 수
    const parts = bars();
    expect(parts).toHaveLength(2);
    expect(parts.map(b => b.style.gridColumn)).toEqual(['5 / span 3', '1 / span 4']);
    expect(parts[0].className).toContain('calendar__bar--cont-after');
    expect(parts[0].className).not.toContain('calendar__bar--cont-before');
    expect(parts[1].className).toContain('calendar__bar--cont-before');
    expect(parts[1].className).not.toContain('calendar__bar--cont-after');
    // 기간 안의 모든 날에 일정 1개로 센다
    expect(day(5).getAttribute('aria-label')).toBe('11월 5일, 일정 1개');
    expect(day(8).getAttribute('aria-label')).toBe('11월 8일, 일정 1개');
    expect(day(11).getAttribute('aria-label')).toBe('11월 11일, 일정 1개');
    expect(day(12).getAttribute('aria-label')).toBe('11월 12일');
  });

  it('기간 안의 아무 날이나 누르면 목록에 그 항목이 나오고 기간이 함께 표시된다', () => {
    const { day, detail } = setup([todo({ text: '긴 업무', startDate: '2026-11-05', dueDate: '2026-11-11' })]);
    fireEvent.click(day(8));
    const d = within(detail());
    expect(d.getByText('긴 업무')).toBeTruthy();
    expect(d.getByText('11.5 ~ 11.11')).toBeTruthy();
    fireEvent.click(day(12));
    expect(within(detail()).queryByText('긴 업무')).toBeNull();
  });

  it('완료한 할 일과 완료 정리된 이력도 보이고, 완료 표시가 붙는다', () => {
    const { day, detail, bars } = setup(
      [todo({ text: '끝낸 일', completed: true, dueDate: '2026-11-06' })],
      [],
      [{ id: 'old', text: '정리된 일', category: '기본', priority: 'medium', completedAt: '2026-11-03T15:00:00', startDate: '2026-11-02', dueDate: '2026-11-03' }],
    );
    expect(bars().map(b => b.textContent).sort()).toEqual(['끝낸 일', '정리된 일']);
    expect(bars().every(b => b.className.includes('calendar__bar--done'))).toBe(true);
    fireEvent.click(day(3));
    expect(within(detail()).getByText('정리된 일').className).toContain('calendar__item-txt--done');
    expect(within(detail()).getByText('11.2 ~ 11.3')).toBeTruthy();
  });

  it('날짜를 하나도 안 넣은 할 일은 등록한 날에 보인다', () => {
    const { day, barTexts } = setup([todo({ text: '날짜 없음', dueDate: undefined, createdAt: '2026-11-07T09:00:00' })]);
    expect(barTexts()).toEqual(['날짜 없음']);
    expect(day(7).getAttribute('aria-label')).toBe('11월 7일, 일정 1개');
  });

  it('날짜를 누르면 그날의 목록(종류, 카테고리, 완료 여부)을 보여 준다', () => {
    const { day, detail } = setup([
      todo({ text: '연차 쓰는 날', kind: 'leave', dueDate: '2026-11-06' }),
      todo({ text: '유지보수', category: '가나시청', dueDate: '2026-11-06' }),
      todo({ text: '끝낸 일', completed: true, dueDate: '2026-11-06' }),
    ]);
    fireEvent.click(day(6));
    const d = within(detail());
    expect(d.getByText('11월 6일 (금)')).toBeTruthy();
    expect(d.getByText('연차·휴가')).toBeTruthy();
    expect(d.getAllByText('일반 업무')).toHaveLength(2);
    expect(d.getByText('가나시청')).toBeTruthy();
    expect(d.getByText('끝낸 일').className).toContain('calendar__item-txt--done');
    // 연차가 맨 위
    expect(detail().querySelector('.calendar__item-txt')?.textContent).toBe('연차 쓰는 날');
    expect(day(6).getAttribute('aria-pressed')).toBe('true');
    expect(day(4).getAttribute('aria-pressed')).toBe('false');
  });

  it('반복 일정의 앞날 회차를 "예정"으로 보여 준다', () => {
    const { container, day, detail } = setup([], [ROUTINE_SERIES]); // 매주 월요일, 오늘 11/4(수)
    fireEvent.click(day(9));
    const d = within(detail());
    expect(d.getByText('바이러스 검사')).toBeTruthy();
    expect(d.getByText('예정')).toBeTruthy();
    expect(d.getByText('정기 업무')).toBeTruthy();
    expect(container.querySelector('.calendar__bar--upcoming')).not.toBeNull();
    expect(day(2).getAttribute('aria-label')).toBe('11월 2일'); // 지난 회차는 예정으로 보이지 않는다
  });

  it('이전·다음 달로 옮기면 선택이 풀리고, 오늘 버튼으로 이번 달 오늘로 돌아온다', () => {
    const { getByText, getByRole, container, detail } = setup();
    const todayBtn = getByRole('button', { name: '오늘' }) as HTMLButtonElement;
    expect(todayBtn.disabled).toBe(true);

    fireEvent.click(getByRole('button', { name: '다음 달' }));
    expect(getByText('2026년 12월')).toBeTruthy();
    expect(container.querySelectorAll('.calendar__day')).toHaveLength(31);
    expect(within(detail()).getByText('날짜를 눌러 그날의 일정을 확인하세요.')).toBeTruthy();
    expect(container.querySelectorAll('[aria-current="date"]')).toHaveLength(0); // 12월엔 오늘이 없다
    expect(todayBtn.disabled).toBe(false);

    fireEvent.click(getByRole('button', { name: '이전 달' }));
    fireEvent.click(getByRole('button', { name: '이전 달' }));
    expect(getByText('2026년 10월')).toBeTruthy();

    fireEvent.click(todayBtn);
    expect(getByText('2026년 11월')).toBeTruthy();
    expect(within(detail()).getByText('11월 4일 (수)')).toBeTruthy();
    expect(todayBtn.disabled).toBe(true);
  });

  it('달을 옮기면 그 달의 일정을 보여 준다', () => {
    const { getByRole, day } = setup([todo({ text: '12월 일', dueDate: '2026-12-15' })]);
    fireEvent.click(getByRole('button', { name: '다음 달' }));
    expect(day(15).getAttribute('aria-label')).toBe('12월 15일, 일정 1개');
  });
});

describe('CalendarPage — 완료한 항목 숨기기', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-04T10:00:00'));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  const DATA = () => [
    todo({ text: '할 일 진행', dueDate: '2026-11-10' }),
    todo({ text: '할 일 완료', completed: true, dueDate: '2026-11-10' }),
  ];
  const LOG: CompletionLogEntry[] = [
    { id: 'old', text: '정리된 일', category: '기본', priority: 'medium', completedAt: '2026-11-03T15:00:00', dueDate: '2026-11-10' },
  ];

  it('처음엔 완료한 항목도 보이고, 체크하면 완료한 할 일과 완료 이력이 띠·개수·목록에서 빠진다', () => {
    const { getByLabelText, barTexts, day, detail } = setup(DATA(), [], LOG);
    const box = getByLabelText('완료한 항목 숨기기') as HTMLInputElement;
    expect(box.checked).toBe(false);
    expect(barTexts().sort()).toEqual(['정리된 일', '할 일 완료', '할 일 진행']);
    expect(day(10).getAttribute('aria-label')).toBe('11월 10일, 일정 3개');

    fireEvent.click(box);
    expect(box.checked).toBe(true);
    expect(barTexts()).toEqual(['할 일 진행']);
    expect(day(10).getAttribute('aria-label')).toBe('11월 10일, 일정 1개');
    fireEvent.click(day(10));
    expect(within(detail()).queryByText('할 일 완료')).toBeNull();
    expect(within(detail()).queryByText('정리된 일')).toBeNull();
    expect(within(detail()).getByText('할 일 진행')).toBeTruthy();

    fireEvent.click(box);
    expect(barTexts()).toHaveLength(3);
  });

  it('완료한 것뿐인 날은 일정이 없는 날처럼 보이고, 반복 예정은 계속 보인다', () => {
    const { getByLabelText, day, barTexts } = setup([todo({ text: '끝낸 일', completed: true, dueDate: '2026-11-09' })], [ROUTINE_SERIES]);
    fireEvent.click(getByLabelText('완료한 항목 숨기기'));
    expect(day(9).getAttribute('aria-label')).toBe('11월 9일, 일정 1개'); // 예정 회차만 남는다
    expect(barTexts()).not.toContain('끝낸 일');
  });

  it('고른 설정은 다음에 열어도 유지된다', () => {
    const first = setup(DATA());
    fireEvent.click(first.getByLabelText('완료한 항목 숨기기'));
    cleanup();
    const again = setup(DATA());
    expect((again.getByLabelText('완료한 항목 숨기기') as HTMLInputElement).checked).toBe(true);
    expect(again.barTexts()).toEqual(['할 일 진행']);
  });
});

describe('CalendarPage — 보기 전용', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-04T10:00:00'));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('연차·휴가 등록 폼과 삭제 버튼이 없고, 할 일 화면으로 가는 안내만 둔다', () => {
    const { queryByRole, queryByLabelText, getByRole, day } = setup([
      todo({ text: '연차 (병원 진료)', kind: 'leave', dueDate: '2026-11-06' }),
    ]);
    fireEvent.click(day(6));
    expect(queryByLabelText('사유 (선택)')).toBeNull();
    expect(queryByRole('button', { name: '등록' })).toBeNull();
    expect(queryByRole('button', { name: /삭제$/ })).toBeNull();
    expect(getByRole('link', { name: '할 일' }).getAttribute('href')).toBe('#/todos');
  });
});
