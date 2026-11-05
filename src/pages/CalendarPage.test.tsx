import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup, within } from '@testing-library/react';
import CalendarPage from './CalendarPage';
import type { Todo, RecurrenceSeries } from '../types/todo';

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

function setup(todos: Todo[] = [], series: RecurrenceSeries[] = []) {
  const onAddLeave = vi.fn();
  const utils = render(<CalendarPage todos={todos} series={series} onAddLeave={onAddLeave} />);
  const day = (n: number) => utils.getByRole('button', { name: new RegExp(`^\\d+월 ${n}일`) });
  const detail = () => utils.container.querySelector('.calendar__detail') as HTMLElement;
  return { ...utils, day, detail, onAddLeave };
}

describe('CalendarPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-04T10:00:00'));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
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

  it('마감일이 있는 항목을 그 날짜 칸에 보여 주고, 넘치면 +N으로 줄인다', () => {
    const { day } = setup([
      todo({ text: '일 하나', dueDate: '2026-11-10' }),
      todo({ text: '일 둘', dueDate: '2026-11-10' }),
      todo({ text: '일 셋', dueDate: '2026-11-10' }),
      todo({ text: '일 넷', dueDate: '2026-11-10' }),
      todo({ text: '다른 날', dueDate: '2026-11-11' }),
    ]);
    const ten = day(10);
    expect(ten.getAttribute('aria-label')).toBe('11월 10일, 일정 4개');
    expect(within(ten).getAllByText(/^일 (하나|둘|셋|넷)$/)).toHaveLength(3);
    expect(within(ten).getByText('+1')).toBeTruthy();
    expect(day(11).getAttribute('aria-label')).toBe('11월 11일, 일정 1개');
    expect(day(12).getAttribute('aria-label')).toBe('11월 12일'); // 일정이 없으면 개수를 덧붙이지 않는다
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
    const { day, detail } = setup([], [ROUTINE_SERIES]); // 매주 월요일, 오늘 11/4(수)
    fireEvent.click(day(9));
    const d = within(detail());
    expect(d.getByText('바이러스 검사')).toBeTruthy();
    expect(d.getByText('예정')).toBeTruthy();
    expect(d.getByText('정기 업무')).toBeTruthy();
    expect(day(9).querySelector('.calendar__chip--upcoming')).not.toBeNull();
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

describe('CalendarPage — 연차·휴가 빠른 등록', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-04T10:00:00'));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('고른 날짜에 버튼 한 번으로 연차를 등록한다 (처음엔 오늘이 골라져 있다)', () => {
    const { getByRole, onAddLeave } = setup();
    fireEvent.click(getByRole('button', { name: '연차' }));
    expect(onAddLeave).toHaveBeenCalledTimes(1);
    expect(onAddLeave).toHaveBeenCalledWith('2026-11-04', '연차');
  });

  it('다른 날짜를 누르면 그 날짜로 등록하고, 반차도 같은 방식이다', () => {
    const { getByRole, day, onAddLeave } = setup();
    fireEvent.click(day(6));
    fireEvent.click(getByRole('button', { name: '오전 반차' }));
    expect(onAddLeave).toHaveBeenLastCalledWith('2026-11-06', '오전 반차');
    fireEvent.click(getByRole('button', { name: '오후 반차' }));
    expect(onAddLeave).toHaveBeenLastCalledWith('2026-11-06', '오후 반차');
  });

  it('그날 이미 같은 이름이 있으면 버튼이 막혀 중복 등록을 못 한다', () => {
    const { getByRole, onAddLeave } = setup([todo({ text: '연차', kind: 'leave', dueDate: '2026-11-04' })]);
    const registered = getByRole('button', { name: '연차 (등록됨)' }) as HTMLButtonElement;
    expect(registered.disabled).toBe(true);
    fireEvent.click(registered);
    expect(onAddLeave).not.toHaveBeenCalled();
    expect((getByRole('button', { name: '오전 반차' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('일반 업무 이름이 같아도 연차 버튼은 막지 않는다', () => {
    const { getByRole } = setup([todo({ text: '연차', kind: 'task', dueDate: '2026-11-04' })]);
    expect((getByRole('button', { name: '연차' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('직접 입력한 이름으로 등록하고 입력칸을 비운다', () => {
    const { getByLabelText, getByRole, onAddLeave } = setup();
    const input = getByLabelText('직접 입력하는 휴가 이름') as HTMLInputElement;
    const submit = getByRole('button', { name: '등록' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true); // 비어 있으면 못 누른다

    fireEvent.change(input, { target: { value: '  병가  ' } });
    expect(submit.disabled).toBe(false);
    fireEvent.click(submit);
    expect(onAddLeave).toHaveBeenCalledWith('2026-11-04', '병가'); // 앞뒤 공백은 뗀다
    expect(input.value).toBe('');
  });

  it('공백만 입력하거나 이미 있는 이름이면 등록하지 못한다', () => {
    const { getByLabelText, getByRole, onAddLeave } = setup([todo({ text: '병가', kind: 'leave', dueDate: '2026-11-04' })]);
    const input = getByLabelText('직접 입력하는 휴가 이름') as HTMLInputElement;
    const submit = getByRole('button', { name: '등록' }) as HTMLButtonElement;

    fireEvent.change(input, { target: { value: '   ' } });
    expect(submit.disabled).toBe(true);

    fireEvent.change(input, { target: { value: '병가' } });
    expect(submit.disabled).toBe(true);
    expect(onAddLeave).not.toHaveBeenCalled();
  });

  it('날짜를 고르지 않은 상태(다른 달로 이동 직후)에는 등록칸이 보이지 않는다', () => {
    const { getByRole, queryByRole } = setup();
    fireEvent.click(getByRole('button', { name: '다음 달' }));
    expect(queryByRole('button', { name: '오전 반차' })).toBeNull();
  });
});
