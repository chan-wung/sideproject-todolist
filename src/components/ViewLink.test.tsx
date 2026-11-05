import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import ViewLink from './ViewLink';

describe('ViewLink', () => {
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
  });

  afterEach(() => {
    cleanup();
    window.history.replaceState(null, '', '/');
  });

  it('진짜 링크(해시 없는 주소)로 그려진다', () => {
    const { getByRole } = render(<ViewLink view="report">주간보고</ViewLink>);
    expect(getByRole('link', { name: '주간보고' }).getAttribute('href')).toBe('/report');
  });

  it('그냥 누르면 페이지를 새로 불러오지 않고 주소만 바꾼다', () => {
    const { getByRole } = render(<ViewLink view="calendar">캘린더</ViewLink>);
    const link = getByRole('link', { name: '캘린더' });
    const notPrevented = fireEvent.click(link);
    expect(notPrevented).toBe(false); // 기본 동작(페이지 이동)을 막았다
    expect(window.location.pathname).toBe('/calendar');
  });

  it('Ctrl·⌘·Shift·Alt를 누른 클릭이나 가운데 버튼은 브라우저에 맡긴다 (새 탭 열기)', () => {
    const { getByRole } = render(<ViewLink view="calendar">캘린더</ViewLink>);
    const link = getByRole('link', { name: '캘린더' });
    for (const init of [{ ctrlKey: true }, { metaKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }]) {
      expect(fireEvent.click(link, init)).toBe(true);
    }
    expect(window.location.pathname).toBe('/');
  });

  it('넘겨 준 onClick도 호출하고, 거기서 막으면 화면을 옮기지 않는다', () => {
    const onClick = vi.fn((e: React.MouseEvent) => e.preventDefault());
    const { getByRole } = render(<ViewLink view="memo" onClick={onClick}>메모장</ViewLink>);
    fireEvent.click(getByRole('link', { name: '메모장' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(window.location.pathname).toBe('/');
  });
});
