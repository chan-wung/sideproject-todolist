import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useTheme } from './useTheme';

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    delete document.body.dataset.theme;
  });
  afterEach(() => cleanup());

  it('처음에는 라이트이고 body에 data-theme이 없다', () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('light');
    expect(document.body.dataset.theme).toBeUndefined();
  });

  it('전환하면 body에 data-theme="dark"가 붙고 저장된다', () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe('dark');
    expect(document.body.dataset.theme).toBe('dark');
    expect(localStorage.getItem('todolist-pref-theme')).toBe('"dark"');

    act(() => result.current.toggleTheme());
    expect(result.current.theme).toBe('light');
    expect(document.body.dataset.theme).toBeUndefined();
  });

  it('저장된 다크 값으로 시작한다', () => {
    localStorage.setItem('todolist-pref-theme', '"dark"');
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme).toBe('dark');
    expect(document.body.dataset.theme).toBe('dark');
  });
});
