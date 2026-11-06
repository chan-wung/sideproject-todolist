import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useShareActions } from './useShareActions';
import * as share from '../utils/share';

describe('useShareActions.runCopy', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('복사에 성공하면 true를 돌려주고 성공 토스트를 띄운다', async () => {
    vi.spyOn(share, 'copyText').mockResolvedValue(true);
    const showToast = vi.fn();
    const { result } = renderHook(() => useShareActions(showToast));

    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.runCopy('글', '복사했습니다.'); });

    expect(ok).toBe(true);
    expect(showToast).toHaveBeenCalledWith({ message: '복사했습니다.', type: 'success' });
  });

  it('복사에 실패하면 false를 돌려주고 실패 토스트를 띄운다', async () => {
    vi.spyOn(share, 'copyText').mockResolvedValue(false);
    const showToast = vi.fn();
    const { result } = renderHook(() => useShareActions(showToast));

    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.runCopy('글', '복사했습니다.'); });

    expect(ok).toBe(false);
    expect(showToast).toHaveBeenCalledWith({ message: '복사에 실패했습니다.', type: 'danger' });
  });

  it('복사 중 예외가 나도 false로 처리한다', async () => {
    vi.spyOn(share, 'copyText').mockRejectedValue(new Error('boom'));
    const showToast = vi.fn();
    const { result } = renderHook(() => useShareActions(showToast));

    let ok: boolean | undefined;
    await act(async () => { ok = await result.current.runCopy('글', '복사했습니다.'); });

    expect(ok).toBe(false);
    expect(showToast).toHaveBeenCalledWith({ message: '복사에 실패했습니다.', type: 'danger' });
  });
});
