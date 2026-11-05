import { describe, it, expect, afterEach, beforeEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { parseView, viewHref, useView, navigate, migrateLegacyHash } from './useView';

// 뒤로 가기·앞으로 가기처럼 주소가 바뀌고 popstate가 오는 상황을 흉내 낸다
function goBackTo(path: string) {
  act(() => {
    window.history.pushState(null, '', path);
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
}

describe('parseView', () => {
  it('알려진 화면 이름을 돌려준다', () => {
    expect(parseView('/todos')).toBe('todos');
    expect(parseView('/report')).toBe('report');
    expect(parseView('/calendar')).toBe('calendar');
    expect(parseView('/dashboard')).toBe('dashboard');
    expect(parseView('/memo')).toBe('memo');
    expect(parseView('/report/')).toBe('report');
  });

  it('옛 해시 주소도 같은 화면으로 읽는다', () => {
    expect(parseView('#/todos')).toBe('todos');
    expect(parseView('#/report')).toBe('report');
    expect(parseView('#report')).toBe('report');
  });

  it('비었거나 모르는 값이면 할 일 화면으로 둔다', () => {
    expect(parseView('')).toBe('todos');
    expect(parseView('/')).toBe('todos');
    expect(parseView('#')).toBe('todos');
    expect(parseView('/unknown')).toBe('todos');
    expect(parseView('/report/extra')).toBe('todos');
  });
});

describe('viewHref', () => {
  it('화면 이름을 해시 없는 주소로 바꾼다', () => {
    expect(viewHref('report')).toBe('/report');
    expect(viewHref('todos')).toBe('/todos');
  });
});

describe('useView · navigate', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '/');
  });

  it('처음 주소의 경로를 읽는다', () => {
    window.history.replaceState(null, '', '/report');
    const { result } = renderHook(() => useView());
    expect(result.current).toBe('report');
  });

  it('주소가 / 이면 기본 화면(할 일)이다', () => {
    const { result } = renderHook(() => useView());
    expect(result.current).toBe('todos');
  });

  it('navigate로 옮기면 주소가 바뀌고 화면도 바뀐다 (해시는 붙지 않는다)', () => {
    const { result } = renderHook(() => useView());
    act(() => navigate('calendar'));
    expect(result.current).toBe('calendar');
    expect(window.location.pathname).toBe('/calendar');
    expect(window.location.hash).toBe('');
  });

  it('같은 화면으로 다시 옮겨도 기록을 더 쌓지 않는다', () => {
    const { result } = renderHook(() => useView());
    act(() => navigate('report'));
    const length = window.history.length;
    act(() => navigate('report'));
    expect(window.history.length).toBe(length);
    expect(result.current).toBe('report');
  });

  it('뒤로·앞으로 가기로 주소가 바뀌면 화면도 따라간다', () => {
    const { result } = renderHook(() => useView());
    goBackTo('/report');
    expect(result.current).toBe('report');
    goBackTo('/nowhere');
    expect(result.current).toBe('todos');
  });
});

describe('migrateLegacyHash', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('옛 북마크(/#/report)는 /report로 바꾼다', () => {
    window.history.replaceState(null, '', '/#/report');
    migrateLegacyHash();
    expect(window.location.pathname).toBe('/report');
    expect(window.location.hash).toBe('');
  });

  it('모르는 해시나 해시가 없는 주소는 건드리지 않는다', () => {
    window.history.replaceState(null, '', '/#/nowhere');
    migrateLegacyHash();
    expect(window.location.pathname).toBe('/');
    expect(window.location.hash).toBe('#/nowhere');

    window.history.replaceState(null, '', '/calendar');
    migrateLegacyHash();
    expect(window.location.pathname).toBe('/calendar');
  });
});
