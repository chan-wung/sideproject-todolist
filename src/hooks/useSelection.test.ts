import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useSelection } from './useSelection';

describe('useSelection', () => {
  it('처음엔 선택 모드가 꺼져 있고 선택도 비어 있다', () => {
    const { result } = renderHook(() => useSelection());
    expect(result.current.selectionMode).toBe(false);
    expect(result.current.selectedIds.size).toBe(0);
  });

  it('toggle은 id를 선택/해제한다', () => {
    const { result } = renderHook(() => useSelection());
    act(() => result.current.toggle('a'));
    act(() => result.current.toggle('b'));
    expect([...result.current.selectedIds]).toEqual(['a', 'b']);
    act(() => result.current.toggle('a'));
    expect([...result.current.selectedIds]).toEqual(['b']);
  });

  it('selectAll은 주어진 id로 선택을 교체하고, clear는 비운다', () => {
    const { result } = renderHook(() => useSelection());
    act(() => result.current.toggle('x'));
    act(() => result.current.selectAll(['a', 'b', 'c']));
    expect([...result.current.selectedIds]).toEqual(['a', 'b', 'c']);
    act(() => result.current.clear());
    expect(result.current.selectedIds.size).toBe(0);
  });

  it('toggleMode는 모드를 뒤집고 매번 선택을 초기화한다', () => {
    const { result } = renderHook(() => useSelection());
    act(() => result.current.toggleMode());
    expect(result.current.selectionMode).toBe(true);
    act(() => result.current.toggle('a'));
    act(() => result.current.toggleMode());
    expect(result.current.selectionMode).toBe(false);
    expect(result.current.selectedIds.size).toBe(0);
  });
});
