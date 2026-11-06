import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup, screen, act } from '@testing-library/react';
import UpdateNotice from './UpdateNotice';
import App from '../App';
import { markUpdateReady, dismissUpdate, applyUpdate, isUpdateReady } from '../utils/pwaUpdate';
import { resetStorageTracking } from '../utils/storage';

describe('pwaUpdate', () => {
  afterEach(() => dismissUpdate());

  it('새 버전이 준비되면 알리고, 적용은 사용자가 고를 때만 실행된다', () => {
    const apply = vi.fn();
    expect(isUpdateReady()).toBe(false);

    markUpdateReady(apply);
    expect(isUpdateReady()).toBe(true);
    expect(apply).not.toHaveBeenCalled(); // 저절로 적용하지 않는다

    applyUpdate();
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it('나중에를 고르면 안내가 내려간다', () => {
    markUpdateReady(vi.fn());
    dismissUpdate();
    expect(isUpdateReady()).toBe(false);
  });
});

describe('UpdateNotice', () => {
  afterEach(cleanup);

  it('쓰던 입력이 사라진다는 경고와 두 버튼을 보여 준다', () => {
    const onApply = vi.fn();
    const onLater = vi.fn();
    render(<UpdateNotice onApply={onApply} onLater={onLater} />);
    expect(screen.getByRole('status').textContent).toContain('등록하지 않은 입력은 사라지니');
    fireEvent.click(screen.getByRole('button', { name: '지금 새로고침' }));
    fireEvent.click(screen.getByRole('button', { name: '나중에' }));
    expect(onApply).toHaveBeenCalledTimes(1);
    expect(onLater).toHaveBeenCalledTimes(1);
  });
});

describe('App — 새 버전 안내', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStorageTracking();
    window.history.replaceState(null, '', '/todos');
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  });
  afterEach(() => {
    cleanup();
    dismissUpdate();
    localStorage.clear();
    resetStorageTracking();
  });

  it('새 버전이 준비되면 안내가 뜨고 쓰던 글은 그대로이며, 나중에를 누르면 사라진다', async () => {
    const apply = vi.fn();
    render(<App />);
    const field = screen.getByPlaceholderText(/크게 할 일을 입력하세요/) as HTMLTextAreaElement;
    fireEvent.change(field, { target: { value: '쓰던 글' } });
    expect(screen.queryByText(/새 버전이 준비되었습니다/)).toBeNull();

    act(() => markUpdateReady(apply));
    await screen.findByText(/새 버전이 준비되었습니다/);
    expect(apply).not.toHaveBeenCalled(); // 화면을 저절로 다시 불러오지 않는다
    expect(field.value).toBe('쓰던 글');

    fireEvent.click(screen.getByRole('button', { name: '나중에' }));
    expect(screen.queryByText(/새 버전이 준비되었습니다/)).toBeNull();
    expect(field.value).toBe('쓰던 글');
  });

  it('지금 새로고침을 누르면 새 버전을 적용한다', async () => {
    const apply = vi.fn();
    render(<App />);
    act(() => markUpdateReady(apply));
    fireEvent.click(await screen.findByRole('button', { name: '지금 새로고침' }));
    expect(apply).toHaveBeenCalledTimes(1);
  });
});
