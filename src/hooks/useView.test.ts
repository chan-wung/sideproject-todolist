import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { parseView, viewHref, useView } from './useView';

function goTo(hash: string) {
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new Event('hashchange'));
  });
}

describe('parseView', () => {
  it('알려진 화면 이름을 돌려준다', () => {
    expect(parseView('#/todos')).toBe('todos');
    expect(parseView('#/report')).toBe('report');
    expect(parseView('#/calendar')).toBe('calendar');
    expect(parseView('#/dashboard')).toBe('dashboard');
    expect(parseView('#/memo')).toBe('memo');
    expect(parseView('#report')).toBe('report');
  });

  it('비었거나 모르는 값이면 할 일 화면으로 둔다', () => {
    expect(parseView('')).toBe('todos');
    expect(parseView('#')).toBe('todos');
    expect(parseView('#/unknown')).toBe('todos');
  });
});

describe('viewHref', () => {
  it('화면 이름을 해시 주소로 바꾼다', () => {
    expect(viewHref('report')).toBe('#/report');
  });
});

describe('useView', () => {
  beforeEach(() => {
    window.location.hash = '';
  });

  afterEach(() => {
    cleanup();
    window.location.hash = '';
  });

  it('처음 주소의 해시를 읽는다', () => {
    window.location.hash = '#/report';
    const { result } = renderHook(() => useView());
    expect(result.current).toBe('report');
  });

  it('해시가 바뀌면 화면도 바뀐다', () => {
    const { result } = renderHook(() => useView());
    expect(result.current).toBe('todos');
    goTo('#/report');
    expect(result.current).toBe('report');
    goTo('#/nowhere');
    expect(result.current).toBe('todos');
  });
});
