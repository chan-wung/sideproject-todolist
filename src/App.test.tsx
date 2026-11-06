import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, cleanup, waitFor, screen, within } from '@testing-library/react';
import App from './App';

// 업체·이름은 모두 가상의 값이다.
const NOW = '2026-11-04T10:00:00';

const stored = (key: string) => {
  const raw = localStorage.getItem(key);
  return raw === null ? null : JSON.parse(raw);
};

function todo(id: string, text: string, extra: Record<string, unknown> = {}) {
  return { id, text, completed: false, priority: 'medium', category: '기본', createdAt: '2026-11-01T09:00:00', ...extra };
}

// 프로필 메뉴(사이드바·툴바 두 곳)의 숨은 파일 입력으로 백업 파일을 보낸다
function importFile(container: HTMLElement, content: unknown) {
  const input = container.querySelector('input[type="file"]') as HTMLInputElement;
  const file = new File([JSON.stringify(content)], 'todolist-backup-20261104.json', { type: 'application/json' });
  fireEvent.change(input, { target: { files: [file] } });
}

describe('App 통합', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date(NOW));
    localStorage.clear();
    window.history.replaceState(null, '', '/todos');
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
    // jsdom은 showModal/close 미구현 — open 속성만 토글하는 모킹
    Object.assign(HTMLDialogElement.prototype, {
      showModal(this: HTMLDialogElement) { this.setAttribute('open', ''); },
      close(this: HTMLDialogElement) { this.removeAttribute('open'); },
    });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    localStorage.clear();
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
  });

  describe('백업 가져오기', () => {
    it('확인창에서 구역별 건수를 보여 주고, 취소하면 아무것도 바꾸지 않는다', async () => {
      localStorage.setItem('todolist-items', JSON.stringify([todo('a', '기존 업무')]));
      const { container } = render(<App />);

      importFile(container, { version: 1, todos: [todo('n1', '새 업무 1'), todo('n2', '새 업무 2')], memos: [{ id: 'm1', title: '메모', content: '' }] });

      const dialog = await waitFor(() => {
        const d = document.querySelector('dialog.confirm-modal');
        expect(d).not.toBeNull();
        return d as HTMLElement;
      });
      expect(dialog.textContent).toContain('할 일 2건');
      expect(dialog.textContent).toContain('메모 1건');
      expect(dialog.textContent).not.toContain('완료 이력'); // 파일에 없는 구역은 그대로 둔다는 뜻

      fireEvent.click(within(dialog).getByText('취소'));
      expect(document.querySelector('dialog.confirm-modal')).toBeNull();
      expect(stored('todolist-items').map((t: { id: string }) => t.id)).toEqual(['a']);
    });

    it('확인하면 파일에 있던 구역만 교체하고 나머지는 보존한다', async () => {
      localStorage.setItem('todolist-items', JSON.stringify([todo('a', '기존 업무')]));
      localStorage.setItem('todolist-memos-array', JSON.stringify([{ id: 'keep', title: '남길 메모', content: '' }]));
      const { container } = render(<App />);

      importFile(container, { version: 1, todos: [todo('n1', '새 업무')] });
      const dialog = await waitFor(() => {
        const d = document.querySelector('dialog.confirm-modal');
        expect(d).not.toBeNull();
        return d as HTMLElement;
      });
      fireEvent.click(within(dialog).getByText('가져오기'));

      await waitFor(() => expect(stored('todolist-items').map((t: { id: string }) => t.id)).toEqual(['n1']));
      expect(stored('todolist-memos-array').map((m: { id: string }) => m.id)).toEqual(['keep']);
    });

    it('가져온 지난 연차는 바로 완료 처리되고, 지워진 메모로의 연결은 정리된다', async () => {
      const { container } = render(<App />);
      importFile(container, {
        version: 1,
        todos: [todo('l', '연차', { kind: 'leave', dueDate: '2026-11-01' }), todo('t', '업무', { memoIds: ['ghost'] })],
        memos: [],
      });
      const dialog = await waitFor(() => {
        const d = document.querySelector('dialog.confirm-modal');
        expect(d).not.toBeNull();
        return d as HTMLElement;
      });
      fireEvent.click(within(dialog).getByText('가져오기'));

      await waitFor(() => {
        const items = stored('todolist-items');
        expect(items.find((t: { id: string }) => t.id === 'l').completed).toBe(true);
        expect(items.find((t: { id: string }) => t.id === 't').memoIds).toBeUndefined();
      });
    });

    it('이 앱보다 새로운 version의 백업은 거부하고 아무것도 바꾸지 않는다', async () => {
      localStorage.setItem('todolist-items', JSON.stringify([todo('a', '기존 업무')]));
      const { container } = render(<App />);

      importFile(container, { version: 99, todos: [todo('n1', '새 업무')] });

      await screen.findByText('이 앱보다 새로운 버전에서 만든 백업이라 불러올 수 없습니다.');
      expect(document.querySelector('dialog.confirm-modal')).toBeNull();
      expect(stored('todolist-items').map((t: { id: string }) => t.id)).toEqual(['a']);
    });

    it('version이 없는 옛 형식(할 일 배열)도 확인 후 가져온다', async () => {
      const { container } = render(<App />);
      importFile(container, [todo('old', '옛 백업 업무')]);
      const dialog = await waitFor(() => {
        const d = document.querySelector('dialog.confirm-modal');
        expect(d).not.toBeNull();
        return d as HTMLElement;
      });
      fireEvent.click(within(dialog).getByText('가져오기'));
      await waitFor(() => expect(stored('todolist-items').map((t: { id: string }) => t.id)).toEqual(['old']));
    });
  });

  describe('전체 초기화', () => {
    it('할 일·메모·완료 이력·반복 일정·주간보고를 비우고 설정은 유지한다', async () => {
      localStorage.setItem('todolist-items', JSON.stringify([todo('a', '업무')]));
      localStorage.setItem('todolist-memos-array', JSON.stringify([{ id: 'm', title: '메모', content: '내용' }]));
      localStorage.setItem('todolist-completion-log', JSON.stringify([{ id: 'c', text: '끝낸 일', category: '기본', priority: 'medium', completedAt: '2026-11-02T10:00:00' }]));
      localStorage.setItem('todolist-recurrence-series', JSON.stringify([{
        id: 's', text: '반복', category: '기본', priority: 'medium', frequency: 'weekly', anchorDate: '2099-01-01', status: 'active', createdAt: '2026-11-01T09:00:00',
      }]));
      localStorage.setItem('todolist-weekly-reports', JSON.stringify({ drafts: { '2026-11-02': '글' }, copiedWeeks: ['2026-10-26'] }));
      localStorage.setItem('todolist-pref-theme', JSON.stringify('dark'));
      localStorage.setItem('todolist-pref-profile-name', JSON.stringify('가나다'));

      render(<App />);
      fireEvent.click(screen.getAllByText('설정')[0].closest('button')!);
      const settings = await waitFor(() => {
        const d = document.querySelector('dialog.settings-modal');
        expect(d).not.toBeNull();
        return d as HTMLElement;
      });
      fireEvent.click(within(settings).getByRole('button', { name: '전체 초기화' }));
      const confirm = await waitFor(() => {
        const d = document.querySelector('dialog.confirm-modal');
        expect(d).not.toBeNull();
        return d as HTMLElement;
      });
      expect(confirm.textContent).toContain('완료 이력');
      fireEvent.click(within(confirm).getByText('삭제'));

      await waitFor(() => {
        expect(stored('todolist-items')).toEqual([]);
        expect(stored('todolist-completion-log')).toEqual([]);
        expect(stored('todolist-recurrence-series')).toEqual([]);
        expect(stored('todolist-weekly-reports')).toEqual({ drafts: {}, copiedWeeks: [] });
        expect(stored('todolist-memos-array').every((m: { content: string }) => m.content === '')).toBe(true);
      });
      expect(stored('todolist-pref-theme')).toBe('dark');
      expect(stored('todolist-pref-profile-name')).toBe('가나다');
    });
  });

  it('시작할 때 지워진 메모를 가리키는 연결을 정리한다', async () => {
    localStorage.setItem('todolist-memos-array', JSON.stringify([{ id: 'real', title: '메모', content: '' }]));
    localStorage.setItem('todolist-items', JSON.stringify([todo('a', '업무', { memoIds: ['real', 'ghost'] })]));
    render(<App />);
    await waitFor(() => expect(stored('todolist-items')[0].memoIds).toEqual(['real']));
  });
});

describe('App 초안 보존', () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, '', '/todos');
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  });
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('할 일 입력창에 쓰던 글은 다른 화면에 다녀와도 남는다', async () => {
    render(<App />);
    const field = () => screen.getByPlaceholderText(/크게 할 일을 입력하세요/) as HTMLTextAreaElement;
    fireEvent.change(field(), { target: { value: '쓰다 만 글' } });

    fireEvent.click(screen.getAllByText('메모장')[0].closest('a')!);
    await waitFor(() => expect(screen.queryByPlaceholderText(/크게 할 일을 입력하세요/)).toBeNull());
    fireEvent.click(screen.getAllByText('할 일')[0].closest('a')!);

    await waitFor(() => expect(field().value).toBe('쓰다 만 글'));
  });
});
