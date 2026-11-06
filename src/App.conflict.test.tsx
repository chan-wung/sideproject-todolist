import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, fireEvent, cleanup, waitFor, screen, within } from '@testing-library/react';
import App from './App';
import { resetStorageTracking } from './utils/storage';

// 이름은 모두 가상의 값이다.
const todo = (id: string, text: string) => ({ id, text, completed: false, priority: 'medium', category: '기본', createdAt: '2026-11-01T09:00:00' });

describe('App: 다른 탭 충돌 때 저장 결과 안내 (R04)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date('2026-11-04T10:00:00'));
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
    localStorage.clear();
    resetStorageTracking();
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
  });

  it('다른 탭이 할 일을 바꾼 뒤 가져오면 성공 토스트 대신 저장되지 않았다고 알린다', async () => {
    localStorage.setItem('todolist-items', JSON.stringify([todo('a', '기존 업무')]));
    const { container } = render(<App />);
    localStorage.setItem('todolist-items', JSON.stringify([todo('from-other-tab', '다른 탭 업무')])); // 다른 탭이 저장

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File([JSON.stringify({ version: 1, todos: [todo('n1', '가져온 업무')] })], 'todolist-backup-20261104.json', { type: 'application/json' });
    fireEvent.change(input, { target: { files: [file] } });
    const dialog = await waitFor(() => {
      const d = document.querySelector('dialog.confirm-modal');
      expect(d).not.toBeNull();
      return d as HTMLElement;
    });
    fireEvent.click(within(dialog).getByText('가져오기'));

    await screen.findByText(/브라우저에 저장하지 못한 부분이 있습니다/);
    expect(screen.queryByText('데이터를 성공적으로 불러왔습니다.')).toBeNull();
    expect(JSON.parse(localStorage.getItem('todolist-items')!).map((t: { id: string }) => t.id)).toEqual(['from-other-tab']);
  });
});
