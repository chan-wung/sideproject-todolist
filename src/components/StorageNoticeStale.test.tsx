import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup, screen, waitFor } from '@testing-library/react';
import StorageNotice from './StorageNotice';
import App from '../App';
import { resetStorageTracking } from '../utils/storage';

describe('StorageNotice — 다른 탭에서 바뀐 경우', () => {
  afterEach(cleanup);

  it('선택지 세 개를 보여 주고 각각 동작한다', () => {
    const onExport = vi.fn();
    const onKeepThisTab = vi.fn();
    const onReload = vi.fn();
    render(
      <StorageNotice saveFailed={false} hasCorrupt={false} hasStale onExport={onExport} onKeepThisTab={onKeepThisTab} onReload={onReload}
        onRetry={vi.fn()} onDownloadCorrupt={vi.fn()} onDiscardCorrupt={vi.fn()} />,
    );
    expect(screen.getByRole('alert').textContent).toContain('다른 탭');
    fireEvent.click(screen.getByRole('button', { name: '지금 내보내기' }));
    fireEvent.click(screen.getByRole('button', { name: '이 탭 내용으로 계속' }));
    fireEvent.click(screen.getByRole('button', { name: '다른 탭 내용 불러오기' }));
    expect(onExport).toHaveBeenCalledTimes(1);
    expect(onKeepThisTab).toHaveBeenCalledTimes(1);
    expect(onReload).toHaveBeenCalledTimes(1);
  });
});

describe('App — 다른 탭 변경 안내', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStorageTracking();
    window.history.replaceState(null, '', '/todos');
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  });
  afterEach(() => {
    cleanup();
    localStorage.clear();
    resetStorageTracking();
  });

  it('다른 탭이 데이터를 바꾸면 안내가 뜨고, 이 탭의 내용으로 계속하면 사라진다', async () => {
    localStorage.setItem('todolist-items', JSON.stringify([
      { id: 'a', text: '기존 업무', completed: false, priority: 'medium', category: '기본', createdAt: '2026-11-01T09:00:00' },
    ]));
    render(<App />);
    expect(screen.queryByText(/다른 탭\(또는 창\)에서 데이터가 바뀌었습니다/)).toBeNull();

    const changed = JSON.stringify([]);
    localStorage.setItem('todolist-items', changed);
    window.dispatchEvent(new StorageEvent('storage', { key: 'todolist-items', newValue: changed, storageArea: window.localStorage }));

    await screen.findByText(/다른 탭\(또는 창\)에서 데이터가 바뀌었습니다/);

    fireEvent.click(screen.getByRole('button', { name: '이 탭 내용으로 계속' }));
    await waitFor(() => expect(screen.queryByText(/다른 탭\(또는 창\)에서 데이터가 바뀌었습니다/)).toBeNull());
  });
});
