import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePersistentState } from './usePersistentState';

describe('usePersistentState', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns initial value when no stored value', () => {
    const { result } = renderHook(() => usePersistentState('test-key', 'initial'));
    expect(result.current[0]).toBe('initial');
  });

  it('loads stored value if available', () => {
    localStorage.setItem('test-key', JSON.stringify('stored'));
    const { result } = renderHook(() => usePersistentState('test-key', 'initial'));
    expect(result.current[0]).toBe('stored');
  });

  it('falls back to initial value if stored JSON is broken', () => {
    localStorage.setItem('test-key', '{broken-json');
    const { result } = renderHook(() => usePersistentState('test-key', 'initial'));
    expect(result.current[0]).toBe('initial');
  });

  it('updates state and localStorage', () => {
    const { result } = renderHook(() => usePersistentState('test-key', 'initial'));
    act(() => {
      result.current[1]('new-value');
    });
    expect(result.current[0]).toBe('new-value');
    expect(localStorage.getItem('test-key')).toBe(JSON.stringify('new-value'));
  });
});
