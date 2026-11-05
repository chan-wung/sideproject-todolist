import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import QuickNav from './QuickNav';
import type { Todo } from '../types/todo';

function todo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: Math.random().toString(36).slice(2),
    text: '업무',
    completed: false,
    priority: 'medium',
    category: '기본',
    createdAt: '2026-11-01T09:00:00',
    ...overrides,
  };
}

describe('QuickNav', () => {
  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  it('항목이 없으면 아무것도 그리지 않는다 (공간을 차지하지 않는다)', () => {
    const { container } = render(<QuickNav filteredTodos={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('항목마다 칩을 하나씩 가로 목록으로 보여 준다', () => {
    const { getByRole, getAllByRole } = render(
      <QuickNav filteredTodos={[todo({ text: '첫째 일' }), todo({ text: '둘째 일' })]} />,
    );
    expect(getByRole('navigation', { name: '항목 네비게이션' })).toBeTruthy();
    expect(getAllByRole('listitem')).toHaveLength(2);
    expect(getAllByRole('button').map(b => b.textContent)).toEqual(['첫째 일', '둘째 일']);
  });

  it('긴 제목은 15자에서 줄이고, 전체 제목은 title로 남긴다', () => {
    const long = '가나다라마바사아자차카타파하가나다라';
    const { getByRole } = render(<QuickNav filteredTodos={[todo({ text: long })]} />);
    const btn = getByRole('button');
    expect(btn.textContent).toBe(`${long.slice(0, 15)}…`);
    expect(btn.getAttribute('title')).toBe(long);
  });

  it('고정한 항목은 핀을, 완료한 항목은 취소선 표시를 한다', () => {
    const { getByLabelText, container } = render(
      <QuickNav filteredTodos={[todo({ text: '고정됨', pinned: true }), todo({ text: '끝남', completed: true })]} />,
    );
    expect(getByLabelText('고정됨')).toBeTruthy();
    expect(container.querySelectorAll('.quick-nav__item-label--completed')).toHaveLength(1);
  });

  it('칩을 누르면 그 할 일 카드로 스크롤한다', () => {
    const target = document.createElement('div');
    target.id = 'todo-item-abc';
    const scrollIntoView = vi.fn();
    target.scrollIntoView = scrollIntoView;
    document.body.appendChild(target);

    const { getByRole } = render(<QuickNav filteredTodos={[todo({ id: 'abc', text: '이동할 일' })]} />);
    fireEvent.click(getByRole('button', { name: '이동할 일' }));
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center' });
  });

  it('카드가 화면에 없어도 오류 없이 넘어간다', () => {
    const { getByRole } = render(<QuickNav filteredTodos={[todo({ id: 'none', text: '없는 카드' })]} />);
    expect(() => fireEvent.click(getByRole('button', { name: '없는 카드' }))).not.toThrow();
  });
});
