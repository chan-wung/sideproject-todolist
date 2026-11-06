import { describe, it, expect, afterEach, vi } from 'vitest';
import { renderHook, cleanup } from '@testing-library/react';
import { useStableCallbacks } from './useStableCallbacks';

describe('useStableCallbacks', () => {
  afterEach(cleanup);

  it('다시 그려도 함수 주소가 같다', () => {
    const { result, rerender } = renderHook(({ fn }) => useStableCallbacks({ run: fn }), { initialProps: { fn: vi.fn() as () => void } });
    const first = result.current.run;
    rerender({ fn: vi.fn() as () => void });
    expect(result.current.run).toBe(first);
  });

  it('주소는 같아도 항상 가장 최근 핸들러를 부른다', () => {
    const a = vi.fn((n: number) => `a${n}`);
    const b = vi.fn((n: number) => `b${n}`);
    const { result, rerender } = renderHook(({ fn }) => useStableCallbacks({ run: fn }), { initialProps: { fn: a } });
    const run = result.current.run;
    expect(run(1)).toBe('a1');
    rerender({ fn: b });
    expect(run(2)).toBe('b2');
    expect(a).toHaveBeenCalledWith(1);
    expect(b).toHaveBeenCalledWith(2);
  });
});
