import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, cleanup, within } from '@testing-library/react';
import DashboardPage from './DashboardPage';
import type { Todo, CompletionLogEntry } from '../types/todo';

// 업체·업무 이름은 모두 가상의 이름이다. 오늘은 2026-11-04(수), 이번 주는 11/2(월)~11/8(일).
function todo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: Math.random().toString(36).slice(2),
    text: '업무',
    completed: false,
    priority: 'medium',
    category: '기본',
    createdAt: '2026-10-20T09:00:00',
    ...overrides,
  };
}

const done = (completedAt: string, o: Partial<Todo> = {}) => todo({ completed: true, completedAt, ...o });

function setup(todos: Todo[] = [], log: CompletionLogEntry[] = []) {
  const utils = render(<DashboardPage todos={todos} completionLog={log} />);
  const stat = (label: string) =>
    Array.from(utils.container.querySelectorAll('.dashboard__stat')).find(e => e.textContent?.includes(label)) as HTMLElement;
  const card = (title: string) =>
    Array.from(utils.container.querySelectorAll('.dashboard__card')).find(e => e.querySelector('.dashboard__card-tit')?.textContent?.includes(title)) as HTMLElement;
  return { ...utils, stat, card };
}

describe('DashboardPage', () => {
  beforeEach(() => {
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
    expect(h1[0].textContent).toBe('대시보드');
  });

  it('제목과 이번 주 기간을 보여 준다', () => {
    const { getByText } = setup();
    expect(getByText('대시보드')).toBeTruthy();
    expect(getByText('2026년 11월 1주 (11.2 ~ 11.8)')).toBeTruthy();
  });

  it('숫자 카드: 이번 주 완료(지난주 비교), 진행 중, 밀린 일, 오늘 마감', () => {
    const { stat } = setup([
      done('2026-11-03T10:00:00'),
      done('2026-11-04T10:00:00', { kind: 'routine' }),
      done('2026-10-28T10:00:00'),                       // 지난주
      todo({ dueDate: '2026-10-30' }),                   // 밀림
      todo({ dueDate: '2026-11-04' }),                   // 오늘
      todo({ dueDate: '2026-11-06' }),                   // 이번 주 남은
    ]);
    expect(stat('이번 주 완료').textContent).toContain('2건');
    expect(stat('이번 주 완료').textContent).toContain('지난주 1건 (+1)');
    expect(stat('진행 중').textContent).toContain('3건');
    expect(stat('밀린 일').textContent).toContain('1건');
    expect(stat('밀린 일').querySelector('.dashboard__stat-value--danger')).not.toBeNull();
    expect(stat('오늘 마감').textContent).toContain('1건');
    expect(stat('오늘 마감').textContent).toContain('이번 주 남은 마감 1건');
  });

  it('지난주와 같으면 그렇게 표시하고, 밀린 일이 없으면 위험 색을 쓰지 않는다', () => {
    const { stat } = setup([done('2026-11-03T10:00:00'), done('2026-10-28T10:00:00')]);
    expect(stat('이번 주 완료').textContent).toContain('지난주와 같음 (1건)');
    expect(stat('밀린 일').textContent).toContain('밀린 일이 없습니다');
    expect(stat('밀린 일').querySelector('.dashboard__stat-value--danger')).toBeNull();
  });

  it('프로젝트별 완료: 이번 주 완료한 일을 프로젝트별 개수로 보여 준다', () => {
    const { card } = setup([
      done('2026-11-03T10:00:00', { category: '가나시청' }),
      done('2026-11-03T11:00:00', { category: '가나시청', text: '다른 일' }),
      done('2026-11-04T10:00:00', { category: '다라시스템' }),
      done('2026-10-28T10:00:00', { category: '마바기관' }), // 지난주는 제외
    ]);
    const c = within(card('프로젝트별 완료'));
    expect(c.getByText('가나시청').closest('li')?.textContent).toContain('2건');
    expect(c.getByText('다라시스템').closest('li')?.textContent).toContain('1건');
    expect(c.queryByText('마바기관')).toBeNull();
  });

  it('최근 6주 추이: 6칸이고 마지막(이번 주)을 강조한다', () => {
    const { container } = setup([done('2026-11-03T10:00:00'), done('2026-10-28T10:00:00'), done('2026-10-29T10:00:00')]);
    const cols = container.querySelectorAll('.dashboard__trend-col');
    expect(cols).toHaveLength(6);
    expect(cols[5].className).toContain('dashboard__trend-col--now');
    expect(cols[5].textContent).toContain('11월 1주');
    expect(cols[5].querySelector('.dashboard__trend-count')?.textContent).toBe('1');
    expect(cols[4].querySelector('.dashboard__trend-count')?.textContent).toBe('2');
  });

  it('밀린 일: 오래된 순으로 5개까지 보여 주고 나머지는 개수와 링크로 줄인다', () => {
    const overdue = Array.from({ length: 7 }, (_, i) =>
      todo({ id: `o${i}`, text: `밀린 일 ${i + 1}`, dueDate: `2026-10-${String(20 + i).padStart(2, '0')}` }));
    const { card } = setup(overdue);
    const c = within(card('밀린 일'));
    expect(c.getAllByText(/^밀린 일 \d$/)).toHaveLength(5);
    expect(c.getByText('밀린 일 1').closest('li')?.textContent).toContain('15일 지남'); // 10/20 → 11/4
    expect(c.queryByText('밀린 일 6')).toBeNull();
    expect(c.getByText(/외 2건/)).toBeTruthy();
    expect(c.getByRole('link', { name: '할 일에서 보기' }).getAttribute('href')).toBe('/todos');
  });

  it('밀린 일이 없으면 안내 문구를 보여 준다', () => {
    const { card } = setup();
    expect(within(card('밀린 일')).getByText('마감이 지난 미완료 일이 없습니다.')).toBeTruthy();
  });

  it('이번 주 못 한 정기 업무를 마감일과 함께 알리고, 없으면 마쳤다고 알린다', () => {
    const pending = setup([todo({ text: '바이러스 검사', kind: 'routine', dueDate: '2026-11-06' })]);
    const c = within(pending.card('못 한 정기 업무'));
    expect(c.getByText('바이러스 검사').closest('li')?.textContent).toContain('11.6 마감');
    expect(c.getByText(/주간보고에 날짜 줄로 들어가지 않습니다/)).toBeTruthy();
    cleanup();

    const none = setup();
    expect(within(none.card('못 한 정기 업무')).getByText('이번 주 마감인 정기 업무를 모두 마쳤습니다.')).toBeTruthy();
  });

  it('이번 주 연차·휴가를 날짜와 함께 보여 주고 할 일·주간보고로 가는 링크를 둔다', () => {
    const { card } = setup([
      todo({ text: '연차 14:00~15:00 (병원 진료)', kind: 'leave', dueDate: '2026-11-06' }),
      todo({ text: '다음 주 연차', kind: 'leave', dueDate: '2026-11-10' }),
    ]);
    const c = within(card('연차·휴가'));
    expect(c.getByText('11월 6일 (금)')).toBeTruthy();
    expect(c.getByText('연차 14:00~15:00 (병원 진료)')).toBeTruthy();
    expect(c.queryByText('다음 주 연차')).toBeNull();
    expect(c.getByRole('link', { name: '할 일에서 등록' }).getAttribute('href')).toBe('/todos');
    expect(c.getByRole('link', { name: '주간보고 보기' }).getAttribute('href')).toBe('/report');
  });

  it('데이터가 없으면 모든 카드가 빈 상태 안내를 보여 준다', () => {
    const { card, getByText } = setup();
    expect(within(card('프로젝트별 완료')).getByText('이번 주 완료한 일이 없습니다.')).toBeTruthy();
    expect(within(card('연차·휴가')).getByText('이번 주 연차·휴가 일정이 없습니다.')).toBeTruthy();
    expect(getByText('대시보드')).toBeTruthy();
  });
});
