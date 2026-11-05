import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import type { ComponentProps } from 'react';
import AppNav from './AppNav';

function setup(props: Partial<ComponentProps<typeof AppNav>> = {}) {
  const onToggleCollapsed = vi.fn();
  const utils = render(<AppNav current="todos" collapsed={false} onToggleCollapsed={onToggleCollapsed} {...props} />);
  return { ...utils, onToggleCollapsed };
}

describe('AppNav', () => {
  afterEach(() => cleanup());

  it('메뉴 링크가 화면 주소를 가리키고 현재 화면에만 aria-current가 붙는다', () => {
    const { getByRole } = setup({ current: 'report' });
    const todos = getByRole('link', { name: '할 일' });
    const report = getByRole('link', { name: '주간보고' });
    expect(todos.getAttribute('href')).toBe('/todos');
    expect(report.getAttribute('href')).toBe('/report');
    expect(report.getAttribute('aria-current')).toBe('page');
    expect(todos.getAttribute('aria-current')).toBeNull();
  });

  it('펼친 상태에서는 "메뉴 접기" 버튼이 보이고 누르면 핸들러를 호출한다', () => {
    const { getByRole, container, onToggleCollapsed } = setup();
    const btn = getByRole('button', { name: '메뉴 접기' });
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelector('.app-nav--collapsed')).toBeNull();
    fireEvent.click(btn);
    expect(onToggleCollapsed).toHaveBeenCalledTimes(1);
  });

  it('접힌 상태에서는 접힘 클래스와 "메뉴 펼치기" 버튼이 되고, 메뉴 글자는 DOM에 남는다', () => {
    const { getByRole, container } = setup({ collapsed: true });
    const btn = getByRole('button', { name: '메뉴 펼치기' });
    expect(btn.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('.app-nav--collapsed')).not.toBeNull();
    // 글자는 CSS로만 숨기므로 스크린리더용 이름이 그대로 있어야 한다
    expect(getByRole('link', { name: '할 일' })).toBeTruthy();
  });
});
