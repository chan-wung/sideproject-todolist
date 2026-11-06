import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, cleanup, waitFor, screen, within } from '@testing-library/react';
import App from './App';
import { resetStorageTracking } from './utils/storage';

// 앱 전체 흐름 통합 테스트: 백업 왕복, 복사 실패/성공과 미보고 기록. 이름·업체는 모두 가상의 값이다.
const NOW = '2026-11-04T10:00:00'; // 수요일, 이번 주는 11/2(월)~11/8(일)

const KEYS = [
  'todolist-items', 'todolist-memos-array', 'todolist-completion-log', 'todolist-recurrence-series', 'todolist-weekly-reports',
] as const;

const stored = (key: string) => {
  const raw = localStorage.getItem(key);
  return raw === null ? null : JSON.parse(raw);
};

const SEED: Record<(typeof KEYS)[number], unknown> = {
  'todolist-items': [
    { id: 'a', text: '진행 업무', completed: false, priority: 'high', category: '가나시청', createdAt: '2026-11-01T09:00:00', dueDate: '2026-11-10', memoIds: ['m1'] },
    { id: 'b', text: '끝낸 업무', completed: true, completedAt: '2026-11-03T10:00:00', priority: 'medium', category: '다라시스템', createdAt: '2026-11-01T09:00:00', kind: 'routine', subtasks: [{ id: 's', text: '하위', completed: true }] },
  ],
  'todolist-memos-array': [{ id: 'm1', title: '서버 메모', content: '아이디: test' }],
  'todolist-completion-log': [{ id: 'old', text: '지난 업무', category: '기본', priority: 'low', completedAt: '2026-10-28T10:00:00' }],
  'todolist-recurrence-series': [{
    id: 'ser', text: '주간 점검', category: '기본', priority: 'medium', frequency: 'weekly', anchorDate: '2099-01-01', status: 'active', createdAt: '2026-11-01T09:00:00',
  }],
  'todolist-weekly-reports': { drafts: { '2026-11-02': '직접 고친 보고' }, copiedWeeks: ['2026-10-26'] },
};

function readBlob(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(blob);
  });
}

describe('App 통합 흐름', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(NOW));
    localStorage.clear();
    resetStorageTracking();
    window.history.replaceState(null, '', '/todos');
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
    Object.assign(HTMLDialogElement.prototype, {
      showModal(this: HTMLDialogElement) { this.setAttribute('open', ''); },
      close(this: HTMLDialogElement) { this.removeAttribute('open'); },
    });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.restoreAllMocks();
    localStorage.clear();
    resetStorageTracking();
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
    Reflect.deleteProperty(navigator, 'clipboard');
  });

  it('내보낸 백업 파일을 비운 앱에 가져오면 다섯 구역이 그대로 돌아온다', async () => {
    for (const key of KEYS) localStorage.setItem(key, JSON.stringify(SEED[key]));

    // 1) 내보내기: 만들어진 파일 내용을 붙잡는다
    let exported: Blob | null = null;
    URL.createObjectURL = vi.fn((blob: Blob) => { exported = blob; return 'blob:test'; }) as unknown as typeof URL.createObjectURL;
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    const first = render(<App />);
    fireEvent.click(screen.getAllByText('내보내기')[0].closest('button')!);
    expect(exported).not.toBeNull();
    const fileText = await readBlob(exported!);
    const before = Object.fromEntries(KEYS.map(k => [k, stored(k)]));
    first.unmount();

    // 2) 빈 상태의 앱에 가져오기
    localStorage.clear();
    resetStorageTracking();
    const second = render(<App />);
    const input = second.container.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File([fileText], 'todolist-backup-20261104.json', { type: 'application/json' })] } });
    const dialog = await waitFor(() => {
      const d = document.querySelector('dialog.confirm-modal');
      expect(d).not.toBeNull();
      return d as HTMLElement;
    });
    ['할 일 2건', '메모 1건', '완료 이력 1건', '반복 일정 1건'].forEach(line => expect(dialog.textContent).toContain(line));
    fireEvent.click(within(dialog).getByText('가져오기'));

    // 3) 구역별로 같은 내용이어야 한다 (가져온 직후의 정리로 바뀌는 값은 시드에 없다)
    await waitFor(() => expect(stored('todolist-items')).not.toEqual([]));
    for (const key of KEYS) {
      expect(stored(key), key).toEqual(before[key]);
    }
  });

  describe('주간보고 복사', () => {
    function setupReport() {
      localStorage.setItem('todolist-items', JSON.stringify([SEED['todolist-items'] && (SEED['todolist-items'] as unknown[])[1]]));
      window.history.replaceState(null, '', '/report');
      render(<App />);
    }

    it('복사에 실패하면 실패 안내를 보여 주고 복사 완료로 기록하지 않는다', async () => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) }, configurable: true });
      setupReport();

      fireEvent.click(await screen.findByRole('button', { name: '텍스트 복사' }));

      await screen.findByText('복사에 실패했습니다.');
      expect(stored('todolist-weekly-reports')?.copiedWeeks ?? []).not.toContain('2026-11-02');
    });

    it('복사에 성공하면 그 주를 복사 완료로 기록한다', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
      setupReport();

      fireEvent.click(await screen.findByRole('button', { name: '텍스트 복사' }));

      await screen.findByText('주간보고를 클립보드에 복사했습니다.');
      expect(writeText).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(stored('todolist-weekly-reports').copiedWeeks).toContain('2026-11-02'));
    });
  });
});
