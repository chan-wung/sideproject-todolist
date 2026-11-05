import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup, within } from '@testing-library/react';
import CalendarPage from './CalendarPage';
import type { Todo } from '../types/todo';

// 업체·업무 이름은 모두 가상의 이름이다. 오늘은 2026-11-04(수)로 고정.
function todo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: Math.random().toString(36).slice(2),
    text: '업무',
    completed: false,
    priority: 'medium',
    category: '기본',
    createdAt: '2026-10-30T09:00:00',
    dueDate: '2026-11-04',
    ...overrides,
  };
}

function setup(todos: Todo[] = []) {
  const utils = render(<CalendarPage todos={todos} series={[]} completionLog={[]} />);
  const view = (name: string) => utils.getByRole('button', { name, pressed: undefined });
  const click = (name: string) => fireEvent.click(utils.getByRole('button', { name }));
  const heads = () => Array.from(utils.container.querySelectorAll<HTMLElement>('.calendar__time-head'));
  return { ...utils, view, click, heads };
}

describe('CalendarPage — 월·주·일 보기', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-04T10:00:00'));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('처음엔 월 보기이고, 보기 전환 버튼이 월·주·일 순서로 있다', () => {
    const { container, getByRole } = setup();
    const group = getByRole('group', { name: '보기 방식' });
    expect(within(group).getAllByRole('button').map(b => b.textContent)).toEqual(['월', '주', '일']);
    expect(within(group).getByRole('button', { name: '월' }).getAttribute('aria-pressed')).toBe('true');
    expect(container.querySelector('.calendar__time')).toBeNull();
  });

  it('주 보기: 일~토 7일 머리글과 주 범위를 보여 주고, 이전·다음 주로 7일씩 옮긴다', () => {
    const { container, getByText, click, heads } = setup();
    click('주');
    expect(container.querySelector('.calendar__time--week')).toBeTruthy();
    expect(getByText('2026년 11월')).toBeTruthy();
    expect(getByText('11.1 ~ 11.7')).toBeTruthy();
    expect(heads()).toHaveLength(7);
    expect(heads()[3].getAttribute('aria-current')).toBe('date');

    click('다음 주');
    expect(getByText('11.8 ~ 11.14')).toBeTruthy();
    click('이전 주');
    click('이전 주');
    expect(getByText('10.25 ~ 10.31')).toBeTruthy();
    expect(getByText('2026년 10월')).toBeTruthy();
  });

  it('일 보기: 그날 하나만 보여 주고, 제목은 월·일·요일이며 하루씩 옮긴다', () => {
    const { container, getByText, click, heads } = setup();
    click('일');
    expect(container.querySelector('.calendar__time--day')).toBeTruthy();
    expect(heads()).toHaveLength(1);
    expect(getByText('11월 4일 (수)', { selector: '.period-nav__tit' })).toBeTruthy();
    click('다음 날');
    expect(getByText('11월 5일 (목)', { selector: '.period-nav__tit' })).toBeTruthy();
    click('이전 날');
    click('이전 날');
    expect(getByText('11월 3일 (화)', { selector: '.period-nav__tit' })).toBeTruthy();
  });

  it('주 보기 머리글을 누르면 그날이 골라지고 아래 목록이 바뀐다', () => {
    const { container, click, heads } = setup([todo({ text: '[가상구청] 점검', dueDate: '2026-11-06' })]);
    click('주');
    fireEvent.click(heads()[5]);
    const detail = container.querySelector('.calendar__detail') as HTMLElement;
    expect(within(detail).getByText('11월 6일 (금)')).toBeTruthy();
    expect(within(detail).getByText('[가상구청] 점검')).toBeTruthy();
  });

  it('일반 업무는 종일 줄에, 시각이 적힌 시간 연차는 시간 칸에 놓인다', () => {
    const { container, click } = setup([
      todo({ text: '[가상구청] 보고서' }),
      todo({ text: '연차 14:00~15:00 (병원 진료)', kind: 'leave' }),
      todo({ text: '오전 반차', kind: 'leave' }),
    ]);
    click('주');
    const allDay = Array.from(container.querySelectorAll('.calendar__allday .calendar__bar')).map(e => e.textContent);
    expect(allDay).toEqual(['오전 반차', '[가상구청] 보고서']);
    const events = container.querySelectorAll<HTMLElement>('.calendar__event');
    expect(events).toHaveLength(1);
    expect(events[0].textContent).toBe('연차 14:00~15:00 (병원 진료)');
    // 14:00 = 하루의 58.33…% 지점
    expect(parseFloat(events[0].style.top)).toBeCloseTo((14 * 60 / 1440) * 100, 3);
  });

  it('오늘 칸에만 지금 시각 선이 있다', () => {
    const { container, click } = setup();
    click('주');
    const lines = container.querySelectorAll<HTMLElement>('.calendar__now');
    expect(lines).toHaveLength(1);
    expect(parseFloat(lines[0].style.top)).toBeCloseTo((10 * 60 / 1440) * 100, 3);
  });

  it('고른 보기는 다음에 열어도 유지된다', () => {
    const first = setup();
    first.click('주');
    cleanup();
    const second = setup();
    expect(second.container.querySelector('.calendar__time--week')).toBeTruthy();
  });

  it('저장된 보기 값이 이상하면 월 보기로 연다', () => {
    localStorage.setItem('todolist-pref-calendar-view', JSON.stringify('year'));
    const { container } = setup();
    expect(container.querySelector('.calendar__grid')).toBeTruthy();
  });

  it('오늘 버튼은 다른 주·날로 갔다가 오늘로 돌아오고, 이미 오늘이면 꺼져 있다', () => {
    const { getByRole, click, heads } = setup();
    click('주');
    const today = () => getByRole('button', { name: '오늘' }) as HTMLButtonElement;
    expect(today().disabled).toBe(true);
    click('다음 주');
    expect(today().disabled).toBe(false);
    click('오늘');
    expect(today().disabled).toBe(true);
    expect(heads()[3].getAttribute('aria-current')).toBe('date');
  });

  it('보기를 바꿔도 보던 날짜는 그대로다 (월에서 고른 날 → 일 보기)', () => {
    const { getByText, click, getByRole } = setup();
    fireEvent.click(getByRole('button', { name: /^11월 12일/ }));
    click('일');
    expect(getByText('11월 12일 (목)', { selector: '.period-nav__tit' })).toBeTruthy();
    click('월');
    expect(getByText('2026년 11월')).toBeTruthy();
  });
});

describe('CalendarPage — 주말 색', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-04T10:00:00'));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('월 보기: 일요일은 빨강, 토요일은 파랑 모디파이어가 요일 이름과 날짜 칸에 붙는다', () => {
    const { container } = setup();
    const heads = Array.from(container.querySelectorAll('.calendar__head'));
    expect(heads[0].className).toContain('calendar__head--sun');
    expect(heads[6].className).toContain('calendar__head--sat');
    expect(heads.slice(1, 6).some(h => /--(sun|sat)/.test(h.className))).toBe(false);
    // 2026-11-01은 일요일, 7일은 토요일
    expect(within(container as HTMLElement).getByRole('button', { name: /^11월 1일/ }).className).toContain('calendar__day--sun');
    expect(within(container as HTMLElement).getByRole('button', { name: /^11월 7일/ }).className).toContain('calendar__day--sat');
    expect(within(container as HTMLElement).getByRole('button', { name: /^11월 4일/ }).className).not.toMatch(/--(sun|sat)/);
  });

  it('주 보기: 일요일·토요일 머리글에도 같은 색 모디파이어가 붙는다', () => {
    const { container, click } = setup();
    click('주');
    const names = Array.from(container.querySelectorAll('.calendar__time-head .calendar__head'));
    const nums = Array.from(container.querySelectorAll('.calendar__time-num'));
    expect(names[0].className).toContain('calendar__head--sun');
    expect(names[6].className).toContain('calendar__head--sat');
    expect(nums[0].className).toContain('calendar__time-num--sun');
    expect(nums[6].className).toContain('calendar__time-num--sat');
    expect(nums[3].className).not.toMatch(/--(sun|sat)/);
  });
});
