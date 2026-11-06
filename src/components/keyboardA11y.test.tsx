import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup, screen, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import DatePicker from './DatePicker';
import DateRangePicker from './DateRangePicker';
import TodoList from './TodoList';
import TodoItem from './TodoItem';
import MemoPage from '../pages/MemoPage';
import ProfileMenu from './ProfileMenu';
import { formatFullDate } from '../utils/date';
import type { Todo } from '../types/todo';

const NOW = '2026-11-06T10:00:00'; // 금요일

describe('날짜 선택기 키보드·이름', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(NOW));
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('formatFullDate는 요일까지 읽어 준다', () => {
    expect(formatFullDate('2026-11-06')).toBe('2026년 11월 6일 금요일');
    expect(formatFullDate('2026-11-08')).toBe('2026년 11월 8일 일요일');
  });

  it('열면 팝오버가 dialog 이름을 갖고, 날짜는 전체 이름·오늘·선택 상태를 가진다', () => {
    render(<DatePicker value="2026-11-10" onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /2026-11-10/ }));
    const popup = screen.getByRole('dialog', { name: '날짜 선택' });
    const today = within(popup).getByRole('button', { name: '2026년 11월 6일 금요일' });
    expect(today.getAttribute('aria-current')).toBe('date');
    const selected = within(popup).getByRole('button', { name: '2026년 11월 10일 화요일' });
    expect(selected.getAttribute('aria-pressed')).toBe('true');
    expect(today.getAttribute('aria-pressed')).toBe('false');
  });

  it('Esc로 닫고 포커스를 입력 버튼으로 돌려주며, 그 Esc는 바깥 창으로 새지 않는다', () => {
    render(<DatePicker value="" onChange={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: /마감일 선택/ });
    fireEvent.click(trigger);
    expect(screen.queryByRole('dialog', { name: '날짜 선택' })).not.toBeNull();

    const notPrevented = fireEvent.keyDown(document, { key: 'Escape' });
    expect(notPrevented).toBe(false); // preventDefault → <dialog>의 cancel(창 닫힘)이 일어나지 않는다
    expect(screen.queryByRole('dialog', { name: '날짜 선택' })).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('방향키로 날짜 칸 사이를 옮긴다 (좌우 하루, 위아래 한 주, 이번 달 안에서)', () => {
    render(<DatePicker value="" onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /마감일 선택/ }));
    const day = (d: number) => screen.getByRole('button', { name: new RegExp(`월 ${d}일`) });

    day(6).focus();
    fireEvent.keyDown(day(6), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(day(7));
    fireEvent.keyDown(day(7), { key: 'ArrowDown' });
    expect(document.activeElement).toBe(day(14));
    fireEvent.keyDown(day(14), { key: 'ArrowUp' });
    fireEvent.keyDown(day(7), { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(day(6));

    day(1).focus();
    fireEvent.keyDown(day(1), { key: 'ArrowLeft' }); // 달 경계를 넘지 않는다
    expect(document.activeElement).toBe(day(1));
  });

  it('기간 선택기도 Esc로 닫고 안내 문구가 바뀌는 것을 알린다', () => {
    render(<DateRangePicker startValue="" endValue="" onChange={vi.fn()} />);
    const trigger = screen.getByRole('button', { name: /기간 선택/ });
    fireEvent.click(trigger);
    const popup = screen.getByRole('dialog', { name: '기간 선택' });
    expect(popup.querySelector('[aria-live="polite"]')).not.toBeNull();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: '기간 선택' })).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });
});

const TODO = (id: string, text: string): Todo => ({ id, text, completed: false, priority: 'medium', category: '기본', createdAt: '2026-11-01T09:00:00' });

function itemProps(todo: Todo, onReorderSubtasks = vi.fn()): ComponentProps<typeof TodoItem> {
  return {
    todo, categories: [], memos: [], onToggleSelect: vi.fn(), onToggleSubtasksCollapsed: vi.fn(), onToggle: vi.fn(), onDelete: vi.fn(), onPin: vi.fn(),
    onCopy: vi.fn(), onShare: vi.fn(), onKakaoShare: vi.fn(), onDuplicate: vi.fn(), onUpdate: vi.fn(), onAddSubtask: vi.fn(), onToggleSubtask: vi.fn(),
    onDeleteSubtask: vi.fn(), onUpdateSubtask: vi.fn(), onReorderSubtasks, onOpenMemo: vi.fn(),
  };
}

describe('키보드·터치 순서 이동', () => {
  beforeEach(() => {
    Object.assign(HTMLDialogElement.prototype, {
      showModal(this: HTMLDialogElement) { this.setAttribute('open', ''); },
      close(this: HTMLDialogElement) { this.removeAttribute('open'); },
    });
  });
  afterEach(() => {
    cleanup();
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
  });

  function listProps(sortKey: 'manual' | 'default', onReorderTodos = vi.fn()): ComponentProps<typeof TodoList> {
    return {
      todos: [TODO('a', '첫째'), TODO('b', '둘째'), TODO('c', '셋째')], filterStatus: 'all', sortKey, categories: [], memos: [], onOpenMemo: vi.fn(),
      onToggle: vi.fn(), onDelete: vi.fn(), onPin: vi.fn(), onCopy: vi.fn(), onShare: vi.fn(), onKakaoShare: vi.fn(), onDuplicate: vi.fn(), onUpdate: vi.fn(),
      onAddSubtask: vi.fn(), onToggleSubtask: vi.fn(), onDeleteSubtask: vi.fn(), onToggleSubtasksCollapsed: vi.fn(), onUpdateSubtask: vi.fn(), onReorderSubtasks: vi.fn(), onReorderTodos,
    };
  }

  it('수동 정렬의 더보기 메뉴에 위/아래 이동이 있고, 맨 위는 위로, 맨 아래는 아래로 이동이 없다', () => {
    const onReorderTodos = vi.fn();
    const { container } = render(<TodoList {...listProps('manual', onReorderTodos)} />);
    const items = Array.from(container.querySelectorAll('.todo-list__item')) as HTMLElement[];
    const openMenu = (li: HTMLElement) => fireEvent.click(within(li).getByLabelText('더보기'));

    openMenu(items[0]);
    expect(within(items[0]).queryByText('위로 이동')).toBeNull();
    fireEvent.click(within(items[0]).getByText('아래로 이동'));
    expect(onReorderTodos).toHaveBeenLastCalledWith('a', 'b');

    openMenu(items[2]);
    expect(within(items[2]).queryByText('아래로 이동')).toBeNull();
    fireEvent.click(within(items[2]).getByText('위로 이동'));
    expect(onReorderTodos).toHaveBeenLastCalledWith('c', 'b');
  });

  it('수동 정렬이 아니면 이동 항목을 보여 주지 않는다', () => {
    const { container } = render(<TodoList {...listProps('default')} />);
    const first = container.querySelector('.todo-list__item') as HTMLElement;
    fireEvent.click(within(first).getByLabelText('더보기'));
    expect(within(first).queryByText('위로 이동')).toBeNull();
    expect(within(first).queryByText('아래로 이동')).toBeNull();
  });

  it('하위 항목은 위/아래 버튼으로 옮기고, 맨 위·맨 아래 쪽 버튼은 비활성이다', () => {
    const onReorderSubtasks = vi.fn();
    render(<TodoItem {...itemProps({ ...TODO('t', '업무'), subtasks: [{ id: 's1', text: '하나', completed: false }, { id: 's2', text: '둘', completed: false }] }, onReorderSubtasks)} />);

    expect((screen.getByLabelText('위로 이동: 하나') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByLabelText('아래로 이동: 둘') as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByLabelText('아래로 이동: 하나'));
    expect(onReorderSubtasks).toHaveBeenLastCalledWith('t', 0, 1);
    fireEvent.click(screen.getByLabelText('위로 이동: 둘'));
    expect(onReorderSubtasks).toHaveBeenLastCalledWith('t', 1, 0);
  });

  it('하위 항목이 하나뿐이면 이동 버튼이 없다', () => {
    render(<TodoItem {...itemProps({ ...TODO('t', '업무'), subtasks: [{ id: 's1', text: '하나', completed: false }] })} />);
    expect(screen.queryByLabelText(/위로 이동/)).toBeNull();
  });

  it('메모는 더보기 메뉴에서 목록 순서를 옮긴다', () => {
    const memos = [
      { id: 'm1', title: '하나', content: '' }, { id: 'm2', title: '둘', content: '' }, { id: 'm3', title: '셋', content: '' },
    ];
    const setMemos = vi.fn();
    render(<MemoPage memos={memos} activeId="m2" todos={[]} setMemos={setMemos} setActiveId={vi.fn()} onLinkMemo={vi.fn()} onUnlinkMemo={vi.fn()}
      onCopyText={vi.fn()} onShareText={vi.fn()} onKakaoShareText={vi.fn()} />);

    fireEvent.click(screen.getByLabelText('더보기'));
    fireEvent.click(screen.getByRole('button', { name: /목록에서 위로 이동/ }));
    expect(setMemos).toHaveBeenLastCalledWith([memos[1], memos[0], memos[2]]);
  });
});

describe('메뉴 의미', () => {
  afterEach(cleanup);

  it('프로필 버튼은 메뉴(haspopup)가 아니라 펼침 버튼이다', () => {
    const noop = vi.fn();
    render(<ProfileMenu placement="nav" name="" onNameChange={noop} onExport={noop} onImport={noop} onRecurrenceOpen={noop} onCompletionLogOpen={noop} onSettingsOpen={noop} />);
    const btn = screen.getByTitle('프로필 메뉴');
    expect(btn.getAttribute('aria-haspopup')).toBeNull();
    expect(btn.getAttribute('aria-expanded')).toBe('false');
  });
});
