import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { memo } from 'react';
import { render, fireEvent, cleanup, screen, within } from '@testing-library/react';

// 목록 카드가 몇 번 다시 그려지는지 센다. 실제 카드를 감싼 memo 래퍼라서, 부모가 넘기는 props가 바뀌었을 때만 래퍼가 실행된다.
const renders = vi.hoisted(() => ({ byId: new Map<string, number>() }));

vi.mock('./components/TodoItem', async importOriginal => {
  const actual = await importOriginal<typeof import('./components/TodoItem')>();
  const Inner = actual.default;
  const Counted = memo(function Counted(props: React.ComponentProps<typeof Inner>) {
    renders.byId.set(props.todo.id, (renders.byId.get(props.todo.id) ?? 0) + 1);
    return <Inner {...props} />;
  });
  return { default: Counted };
});

import App from './App';
import { resetStorageTracking } from './utils/storage';

const todo = (i: number) => ({
  id: `t${i}`, text: `가짜 업무 ${i}`, completed: false, priority: 'medium', category: `프로젝트${i % 3}`, createdAt: '2026-11-01T09:00:00',
});

describe('목록 렌더링 범위 (성능 회귀 방지)', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStorageTracking();
    localStorage.setItem('todolist-items', JSON.stringify(Array.from({ length: 30 }, (_, i) => todo(i))));
    window.history.replaceState(null, '', '/todos');
    window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
    renders.byId.clear();
  });
  afterEach(() => {
    cleanup();
    localStorage.clear();
    resetStorageTracking();
  });

  // 같은 글이 빠른 이동 칩에도 있어 카드 본문(.todo-item__txt)으로 찾는다
  const cardOf = (text: string) => screen.getByText(text, { selector: '.todo-item__txt' }).closest('.todo-item') as HTMLElement;

  const total = () => [...renders.byId.values()].reduce((a, b) => a + b, 0);

  it('처음에는 카드 30장이 한 번씩 그려진다', () => {
    render(<App />);
    expect(renders.byId.size).toBe(30);
    expect(total()).toBe(30);
  });

  it('할 일 입력창에 글을 쓰는 동안에는 카드가 다시 그려지지 않는다', () => {
    render(<App />);
    renders.byId.clear();
    const field = screen.getByPlaceholderText(/크게 할 일을 입력하세요/);
    for (const value of ['가', '가나', '가나다', '가나다라']) fireEvent.change(field, { target: { value } });
    expect(total()).toBe(0);
  });

  it('카드 하나를 완료로 바꿔도 다른 카드는 다시 그려지지 않는다 (그 카드는 진행 중 목록에서 빠진다)', () => {
    render(<App />);
    renders.byId.clear();
    const card = cardOf('가짜 업무 4');
    fireEvent.click(within(card).getByRole('checkbox'));
    expect(renders.byId.size).toBe(0);
    expect(screen.queryByText('가짜 업무 4', { selector: '.todo-item__txt' })).toBeNull();
    expect(screen.getAllByText(/가짜 업무 \d+/, { selector: '.todo-item__txt' })).toHaveLength(29);
  });

  it('프로젝트 이름이 그대로인 수정은 다른 카드를 다시 그리지 않는다', () => {
    render(<App />);
    renders.byId.clear();
    const card = cardOf('가짜 업무 7');
    fireEvent.click(within(card).getByLabelText('상단 고정'));
    expect([...renders.byId.keys()]).toEqual(['t7']);
  });
});
