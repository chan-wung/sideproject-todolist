import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup, act } from '@testing-library/react';
import { useState } from 'react';
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

function setup(todos: Todo[] = TODOS, log: CompletionLogEntry[] = LOG, onCopy = vi.fn().mockResolvedValue(true)) {
  const onMarkCopied = vi.fn();
  function TestPage() {
    const [drafts, setDrafts] = useState<Record<string, string>>({});
    return (
      <WeeklyReportPage
        todos={todos}
        completionLog={log}
        onCopy={onCopy}
        drafts={drafts}
        onSaveDraft={(weekStart, text, generatedText) => setDrafts(prev => {
          const next = { ...prev };
          if (text === generatedText) delete next[weekStart];
          else next[weekStart] = text;
          return next;
        })}
        onResetDraft={weekStart => setDrafts(prev => {
          const next = { ...prev };
          delete next[weekStart];
          return next;
        })}
        onMarkCopied={onMarkCopied}
        hasUnreportedLastWeek={false}
      />
    );
  }
  const utils = render(<TestPage />);
  const textarea = () => utils.getByLabelText('주간보고 내용') as HTMLTextAreaElement;
  return { ...utils, onCopy, onMarkCopied, textarea };
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

  it('복사 버튼은 "텍스트 복사" 하나이고, 보고서 글을 따옴표 없이 그대로 복사한다', async () => {
    const { getByRole, getAllByRole, queryByRole, onCopy, onMarkCopied } = setup();
    expect(queryByRole('button', { name: '엑셀 칸에 복사' })).toBeNull();
    expect(getAllByRole('button').filter(b => b.textContent?.includes('복사'))).toHaveLength(1);

    await act(async () => { fireEvent.click(getByRole('button', { name: '텍스트 복사' })); });
    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(onCopy).toHaveBeenLastCalledWith(THIS_WEEK_TEXT, '주간보고를 클립보드에 복사했습니다.');
    expect(onMarkCopied).toHaveBeenCalledTimes(1);
    expect(onMarkCopied).toHaveBeenCalledWith('2026-11-02');
  });

  it('복사에 실패하면 복사 완료로 기록하지 않는다', async () => {
    const { getByRole, onCopy, onMarkCopied } = setup(TODOS, LOG, vi.fn().mockResolvedValue(false));
    await act(async () => { fireEvent.click(getByRole('button', { name: '텍스트 복사' })); });
    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(onMarkCopied).not.toHaveBeenCalled();
  });

  it('복사 중 예외가 나도 복사 완료로 기록하지 않고, 버튼은 다시 눌러진다', async () => {
    const { getByRole, onCopy, onMarkCopied } = setup(TODOS, LOG, vi.fn().mockRejectedValue(new Error('boom')));
    const btn = getByRole('button', { name: '텍스트 복사' }) as HTMLButtonElement;
    await act(async () => { fireEvent.click(btn); });
    expect(onMarkCopied).not.toHaveBeenCalled();
    expect(btn.disabled).toBe(false);
    await act(async () => { fireEvent.click(btn); });
    expect(onCopy).toHaveBeenCalledTimes(2);
  });

  it('복사가 끝나기 전에는 다시 눌러도 복사를 또 시작하지 않는다', async () => {
    let finish: (ok: boolean) => void = () => {};
    const pending = vi.fn(() => new Promise<boolean>(resolve => { finish = resolve; }));
    const { getByRole, onCopy, onMarkCopied } = setup(TODOS, LOG, pending);
    const btn = getByRole('button', { name: '텍스트 복사' }) as HTMLButtonElement;

    await act(async () => { fireEvent.click(btn); fireEvent.click(btn); });
    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(btn.disabled).toBe(true);

    await act(async () => { finish(true); });
    expect(onMarkCopied).toHaveBeenCalledTimes(1);
    expect(btn.disabled).toBe(false);
  });

  it('복사하는 동안 주를 옮겨도 복사를 누른 그 주를 완료로 기록한다', async () => {
    let finish: (ok: boolean) => void = () => {};
    const pending = vi.fn(() => new Promise<boolean>(resolve => { finish = resolve; }));
    const { getByRole, onMarkCopied } = setup(TODOS, LOG, pending);

    await act(async () => { fireEvent.click(getByRole('button', { name: '텍스트 복사' })); });
    fireEvent.click(getByRole('button', { name: '다음주' }));
    await act(async () => { finish(true); });

    expect(onMarkCopied).toHaveBeenCalledTimes(1);
    expect(onMarkCopied).toHaveBeenCalledWith('2026-11-02');
  });

  it('지난주 미보고 안내를 보여 준다', () => {
    const onCopy = vi.fn();
    const { getByText } = render(
      <WeeklyReportPage
        todos={TODOS}
        completionLog={LOG}
        onCopy={onCopy}
        drafts={{}}
        onSaveDraft={vi.fn()}
        onResetDraft={vi.fn()}
        onMarkCopied={vi.fn()}
        hasUnreportedLastWeek
      />,
    );
    expect(getByText(/지난주 보고할 내용이 아직 복사되지 않았습니다/)).toBeTruthy();
  });

  it('손으로 고친 내용이 복사되고, 되돌리기 버튼으로 자동 내용으로 돌아간다', () => {
    const { getByRole, queryByRole, textarea, onCopy } = setup();
    expect(queryByRole('button', { name: '이 주의 수동 편집 내용 초기화' })).toBeNull();

    fireEvent.change(textarea(), { target: { value: '직접 고친 내용' } });
    fireEvent.click(getByRole('button', { name: '텍스트 복사' }));
    expect(onCopy).toHaveBeenLastCalledWith('직접 고친 내용', expect.any(String));

    fireEvent.click(getByRole('button', { name: '이 주의 수동 편집 내용 초기화' }));
    expect(textarea().value).toBe(THIS_WEEK_TEXT);
  });

  it('주를 옮겼다가 돌아와도 손으로 고친 내용을 유지한다', () => {
    const { getByRole, textarea } = setup();
    fireEvent.change(textarea(), { target: { value: '직접 고친 내용' } });
    fireEvent.click(getByRole('button', { name: '지난주' }));
    fireEvent.click(getByRole('button', { name: '다음주' }));
    expect(textarea().value).toBe('직접 고친 내용');
  });

  it('완료한 일이 없는 주는 안내를 보여 주고 복사 버튼을 막는다', () => {
    const { getByText, getByRole } = setup([], []);
    expect(getByText(/이 주에 완료한 일이 없습니다/)).toBeTruthy();
    expect((getByRole('button', { name: '텍스트 복사' }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe('WeeklyReportPage — 하위 항목 포함', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-04T10:00:00'));
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  const WITH_SUBS: Todo[] = [
    {
      id: 'a', text: '유지보수', completed: true, priority: 'medium', category: '가나시청',
      createdAt: '2026-10-30T09:00:00', completedAt: '2026-11-03T10:00:00',
      subtasks: [{ id: 's1', text: '메인 배너 교체', completed: true }, { id: 's2', text: '게시판 오류 수정', completed: true }],
    },
  ];
  const WITH_SUBS_TEXT = ['[가나시청] 유지보수', '- 메인 배너 교체', '- 게시판 오류 수정'].join('\n');

  it('처음엔 하위 항목이 제목 아래에 함께 나오고, 끄면 제목만 나온다', () => {
    const { textarea, getByLabelText } = setup(WITH_SUBS, []);
    const box = getByLabelText('하위 항목 포함') as HTMLInputElement;
    expect(box.checked).toBe(true);
    expect(textarea().value).toBe(WITH_SUBS_TEXT);

    fireEvent.click(box);
    expect(textarea().value).toBe('[가나시청] 유지보수');
    fireEvent.click(box);
    expect(textarea().value).toBe(WITH_SUBS_TEXT);
  });

  it('고른 설정은 다음에 열어도 유지된다', () => {
    const first = setup(WITH_SUBS, []);
    fireEvent.click(first.getByLabelText('하위 항목 포함'));
    cleanup();
    const again = setup(WITH_SUBS, []);
    expect((again.getByLabelText('하위 항목 포함') as HTMLInputElement).checked).toBe(false);
    expect(again.textarea().value).toBe('[가나시청] 유지보수');
  });

  it('직접 고친 내용이 있으면 체크박스를 잠가 고친 내용이 사라지지 않게 한다', () => {
    const { textarea, getByLabelText, getByText, getByRole } = setup(WITH_SUBS, []);
    fireEvent.change(textarea(), { target: { value: '내가 고친 글' } });
    expect((getByLabelText('하위 항목 포함') as HTMLInputElement).disabled).toBe(true);
    expect(getByText(/직접 고친 내용이 있어 바꿀 수 없습니다/)).toBeTruthy();

    fireEvent.click(getByRole('button', { name: '이 주의 수동 편집 내용 초기화' }));
    expect((getByLabelText('하위 항목 포함') as HTMLInputElement).disabled).toBe(false);
    expect(textarea().value).toBe(WITH_SUBS_TEXT);
  });
});

