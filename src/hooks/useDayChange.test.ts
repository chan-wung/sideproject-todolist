import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { useDayChange } from './useDayChange';

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true });
}

describe('useDayChange', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setVisibility('visible');
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('자정 1초 뒤에 호출하고, 이후 매일 다시 예약한다', () => {
    vi.setSystemTime(new Date(2026, 10, 3, 23, 59, 0));
    const onChange = vi.fn();
    renderHook(() => useDayChange(onChange));

    vi.advanceTimersByTime(60 * 1000); // 자정 도달 — 아직 1초 여유
    expect(onChange).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(onChange).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(24 * 60 * 60 * 1000);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('탭이 보이게 되면 호출하고, 숨겨질 때는 호출하지 않는다', () => {
    vi.setSystemTime(new Date(2026, 10, 3, 12, 0, 0));
    const onChange = vi.fn();
    renderHook(() => useDayChange(onChange));

    setVisibility('hidden');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(onChange).not.toHaveBeenCalled();

    setVisibility('visible');
    document.dispatchEvent(new Event('visibilitychange'));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('콜백이 바뀌어도 최신 콜백을 호출한다', () => {
    vi.setSystemTime(new Date(2026, 10, 3, 12, 0, 0));
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = renderHook(({ cb }) => useDayChange(cb), { initialProps: { cb: first } });
    rerender({ cb: second });

    document.dispatchEvent(new Event('visibilitychange'));
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('언마운트하면 타이머와 리스너를 해제한다', () => {
    vi.setSystemTime(new Date(2026, 10, 3, 23, 59, 0));
    const onChange = vi.fn();
    const { unmount } = renderHook(() => useDayChange(onChange));
    unmount();

    vi.advanceTimersByTime(2 * 24 * 60 * 60 * 1000);
    document.dispatchEvent(new Event('visibilitychange'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
