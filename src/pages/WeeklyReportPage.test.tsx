import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import WeeklyReportPage from './WeeklyReportPage';
import type { Todo, CompletionLogEntry } from '../types/todo';

// 업체·시스템 이름은 모두 가상의 이름이다.
const TODOS: Todo[] = [
  {
    id: 'r', text: '바이러스 검사', completed: true, priority: 'medium', category: '기본',
    createdAt: '2026-10-30T09:00:00', completedAt: '2026-11-02T09:00:00', kind: 'routine',
  },
  {
    id: 'a', text: '유지보수(홈페이지 수정요청)', completed: true, priority: 'medium', category: '가나시청',
    createdAt: '2026-10-30T09:00:00', completedAt: '2026-11-03T10:00:00',
  },
];

const LOG: CompletionLogEntry[] = [
  { id: 'old', text: '지난주 작업', category: '다라시스템', priority: 'medium', completedAt: '2026-10-28T10:00:00' },
];

const THIS_WEEK_TEXT = '2026.11.2 바이러스 검사 완료\n\n[가나시청] 유지보수(홈페이지 수정요청)';

function setup(todos: Todo[] = TODOS, log: CompletionLogEntry[] = LOG) {
  const onCopy = vi.fn();
  const utils = render(<WeeklyReportPage todos={todos} completionLog={log} onCopy={onCopy} />);
  const textarea = () => utils.getByLabelText('주간보고 내용') as HTMLTextAreaElement;
  return { ...utils, onCopy, textarea };
}

describe('WeeklyReportPage', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-04T10:00:00')); // 수요일
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('화면 제목은 h1 하나다', () => {
    const { getAllByRole } = setup();
    const h1 = getAllByRole('heading', { level: 1 });
    expect(h1).toHaveLength(1);
    expect(h1[0].textContent).toBe('주간보고');
  });

  it('이번 주의 라벨과 기간, 만들어진 보고서를 보여 준다', () => {
    const { getByText, textarea } = setup();
    expect(getByText('2026년 11월 1주')).toBeTruthy();
    expect(getByText('11.2 ~ 11.8')).toBeTruthy();
    expect(textarea().value).toBe(THIS_WEEK_TEXT);
  });

  it('지난주·다음주로 옮기면 그 주의 보고서로 바뀌고, 이번 주 버튼으로 돌아온다', () => {
    const { getByText, getByRole, textarea } = setup();
    const thisWeek = getByRole('button', { name: '이번 주' }) as HTMLButtonElement;
    expect(thisWeek.disabled).toBe(true);

    fireEvent.click(getByRole('button', { name: '지난주' }));
    expect(getByText('2026년 10월 4주')).toBeTruthy();
    expect(getByText('10.26 ~ 11.1')).toBeTruthy();
    expect(textarea().value).toBe('[다라시스템] 지난주 작업'); // 10/28(수) 완료 — 완료 이력에서 가져옴
    expect(thisWeek.disabled).toBe(false);

    fireEvent.click(getByRole('button', { name: '지난주' }));
    expect(getByText('2026년 10월 3주')).toBeTruthy();
    expect(textarea().value).toBe(''); // 10/19 주에는 완료한 일이 없다

    fireEvent.click(thisWeek);
    expect(textarea().value).toBe(THIS_WEEK_TEXT);

    fireEvent.click(getByRole('button', { name: '다음주' }));
    expect(getByText('2026년 11월 2주')).toBeTruthy();
  });

  it('복사 버튼은 "텍스트 복사" 하나이고, 보고서 글을 따옴표 없이 그대로 복사한다', () => {
    const { getByRole, getAllByRole, queryByRole, onCopy } = setup();
    expect(queryByRole('button', { name: '엑셀 칸에 복사' })).toBeNull();
    expect(getAllByRole('button').filter(b => b.textContent?.includes('복사'))).toHaveLength(1);

    fireEvent.click(getByRole('button', { name: '텍스트 복사' }));
    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(onCopy).toHaveBeenLastCalledWith(THIS_WEEK_TEXT, '주간보고를 클립보드에 복사했습니다.');
  });

  it('손으로 고친 내용이 복사되고, 되돌리기 버튼으로 자동 내용으로 돌아간다', () => {
    const { getByRole, queryByRole, textarea, onCopy } = setup();
    expect(queryByRole('button', { name: '자동으로 만든 내용으로 되돌리기' })).toBeNull();

    fireEvent.change(textarea(), { target: { value: '직접 고친 내용' } });
    fireEvent.click(getByRole('button', { name: '텍스트 복사' }));
    expect(onCopy).toHaveBeenLastCalledWith('직접 고친 내용', expect.any(String));

    fireEvent.click(getByRole('button', { name: '자동으로 만든 내용으로 되돌리기' }));
    expect(textarea().value).toBe(THIS_WEEK_TEXT);
  });

  it('주를 옮기면 손으로 고친 내용은 버린다', () => {
    const { getByRole, textarea } = setup();
    fireEvent.change(textarea(), { target: { value: '직접 고친 내용' } });
    fireEvent.click(getByRole('button', { name: '지난주' }));
    fireEvent.click(getByRole('button', { name: '다음주' }));
    expect(textarea().value).toBe(THIS_WEEK_TEXT);
  });

  it('완료한 일이 없는 주는 안내를 보여 주고 복사 버튼을 막는다', () => {
    const { getByText, getByRole } = setup([], []);
    expect(getByText(/이 주에 완료한 일이 없습니다/)).toBeTruthy();
    expect((getByRole('button', { name: '텍스트 복사' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
