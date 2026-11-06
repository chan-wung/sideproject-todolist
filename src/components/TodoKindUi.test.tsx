// 업무 종류(kind) 선택 화면의 동작: 입력창, 카드 편집 폼, 카드 배지
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup, within } from '@testing-library/react';
import TodoInput from './TodoInput';
import TodoItem from './TodoItem';
import type { Todo } from '../types/todo';

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 't1',
    text: '보고서 작성',
    completed: false,
    priority: 'medium',
    category: '업무',
    createdAt: '2026-07-01T09:00:00',
    ...overrides,
  };
}

function renderItem(todo: Todo) {
  const onUpdate = vi.fn();
  const noop = vi.fn();
  const utils = render(
    <TodoItem
      todo={todo}
      categories={['업무']}
      memos={[]}
      onToggle={noop} onDelete={noop} onPin={noop} onCopy={noop} onShare={noop} onKakaoShare={noop}
      onDuplicate={noop} onUpdate={onUpdate} onAddSubtask={noop} onToggleSubtask={noop}
      onDeleteSubtask={noop} onUpdateSubtask={noop} onReorderSubtasks={noop}
      onToggleSubtasksCollapsed={noop} onOpenMemo={noop}
    />,
  );
  return { ...utils, onUpdate };
}

describe('TodoInput 종류 선택', () => {
  afterEach(() => cleanup());

  function renderInput() {
    const onAdd = vi.fn();
    const utils = render(<TodoInput onAdd={onAdd} categories={[]} />);
    return { ...utils, onAdd };
  }

  function typeAndSubmit(utils: ReturnType<typeof renderInput>, text: string) {
    fireEvent.change(utils.getByPlaceholderText(/크게 할 일을 입력하세요/), { target: { value: text } });
    fireEvent.click(utils.getByRole('button', { name: '추가' }));
  }

  it('종류를 안 고르면 일반 업무로 추가한다', () => {
    const utils = renderInput();
    typeAndSubmit(utils, '일반 업무');
    expect(utils.onAdd).toHaveBeenCalledWith('일반 업무', 'medium', '', '', 'none', 'task', '');
  });

  it('기간 칸에서 시작일과 마감일을 고르면 둘 다 넘기고, 하루만 고르면 마감일만 넘긴다', () => {
    const utils = renderInput();
    const pick = (day: string) => fireEvent.click(within(utils.container.querySelector('.date-range-picker__dropdown') as HTMLElement).getByRole('button', { name: new RegExp(`월 ${day}일`) }));
    const openPicker = () => fireEvent.click(utils.getByRole('button', { name: '기간' }));

    openPicker();
    pick('10');
    pick('20');
    typeAndSubmit(utils, '기간 업무');
    const [, , due, , , , start] = utils.onAdd.mock.calls[0];
    expect(start < due).toBe(true);
    expect(start.endsWith('-10')).toBe(true);
    expect(due.endsWith('-20')).toBe(true);

    openPicker();
    pick('15');
    pick('15');
    typeAndSubmit(utils, '하루 업무');
    const [, , due2, , , , start2] = utils.onAdd.mock.calls[1];
    expect(due2.endsWith('-15')).toBe(true);
    expect(start2).toBe('');
  });

  it('정기 업무를 고르면 그 종류로 추가한다', () => {
    const utils = renderInput();
    fireEvent.change(utils.getByLabelText('종류'), { target: { value: 'routine' } });
    typeAndSubmit(utils, '바이러스 검사');
    expect(utils.onAdd).toHaveBeenCalledWith('바이러스 검사', 'medium', '', '', 'none', 'routine', '');
  });

  it('연차·휴가는 날짜가 없으면 추가하지 않고 안내한다', () => {
    const utils = renderInput();
    fireEvent.change(utils.getByLabelText('종류'), { target: { value: 'leave' } });
    fireEvent.click(utils.getByRole('button', { name: '추가' })); // 연차 모드에는 글 입력칸이 없다
    expect(utils.onAdd).not.toHaveBeenCalled();
    expect(utils.getByText('연차·휴가는 날짜를 선택해 주세요.')).toBeTruthy();
  });

  it('연차·휴가를 고르면 반복 주기 칸이 아예 사라진다', () => {
    const utils = renderInput();
    expect(utils.queryByLabelText('반복 주기')).not.toBeNull();
    fireEvent.change(utils.getByLabelText('종류'), { target: { value: 'leave' } });
    expect(utils.queryByLabelText('반복 주기')).toBeNull();
  });
});

describe('TodoItem 종류 배지와 편집', () => {
  afterEach(() => cleanup());

  it('일반 업무에는 종류 배지가 없고, 정기 업무·연차에는 있다', () => {
    const task = renderItem(makeTodo());
    expect(task.container.querySelector('[class*="todo-item__badge--kind"]')).toBeNull();
    cleanup();

    const routine = renderItem(makeTodo({ kind: 'routine' }));
    expect(within(routine.container).getByText('정기 업무')).toBeTruthy();
    cleanup();

    const leave = renderItem(makeTodo({ kind: 'leave', dueDate: '2026-11-04' }));
    expect(within(leave.container).getByText('연차·휴가')).toBeTruthy();
  });

  it('연차 카드는 우선순위·프로젝트·메모 연결 대신 연차 종류를 보여 준다', () => {
    const { container, queryByText, getByText } = renderItem(makeTodo({ kind: 'leave', text: '오전 반차 (병원)', category: '기본', dueDate: '2026-11-04' }));
    expect(getByText('오전 반차')).toBeTruthy();
    expect(queryByText('기본')).toBeNull();
    expect(queryByText('보통')).toBeNull();
    expect(container.querySelector('.todo-item__memo-link')).toBeNull();
    cleanup();

    const task = renderItem(makeTodo({ category: '춘천시청' }));
    expect(task.getByText('춘천시청')).toBeTruthy();
    expect(task.getByText('보통')).toBeTruthy();
    expect(task.container.querySelector('.todo-item__memo-link')).not.toBeNull();
  });

  it('연차 카드의 수정 폼에는 연결 메모 칸이 없다', () => {
    const { container, queryByText } = renderItem(makeTodo({ kind: 'leave', text: '연차', dueDate: '2026-11-04' }));
    fireEvent.click(container.querySelector('.todo-item__btn--edit') as HTMLElement);
    expect(queryByText('연결 메모')).toBeNull();
  });

  function enterEdit(container: HTMLElement) {
    fireEvent.click(container.querySelector('.todo-item__btn--edit') as HTMLElement);
  }

  it('시작일이 있는 카드는 기간으로, 없는 카드는 마감일로 보여 준다', () => {
    const range = renderItem(makeTodo({ startDate: '2099-01-01', dueDate: '2099-01-05' }));
    expect(range.getByText(/기간: 2099\.01\.01 ~ 2099\.01\.05/)).toBeTruthy();
    cleanup();
    const single = renderItem(makeTodo({ dueDate: '2099-01-05' }));
    expect(single.getByText(/마감일: 2099\.01\.05/)).toBeTruthy();
  });

  it('편집 폼에서 기간을 지우고 저장하면 시작일과 마감일이 함께 지워진다', () => {
    const utils = renderItem(makeTodo({ startDate: '2099-01-01', dueDate: '2099-01-05' }));
    fireEvent.click(utils.getByRole('button', { name: '수정' }));
    fireEvent.click(utils.getByRole('button', { name: '초기화' }));
    fireEvent.click(utils.getByRole('button', { name: '수정' }));
    const saved = utils.onUpdate.mock.calls[0][1];
    expect(saved.startDate).toBeUndefined();
    expect(saved.dueDate).toBeUndefined();
  });

  it('편집 폼에서 종류를 바꿔 저장하면 onUpdate에 kind가 담긴다', () => {
    const { container, getByLabelText, onUpdate } = renderItem(makeTodo({ dueDate: '2099-01-01' }));
    enterEdit(container);
    fireEvent.change(getByLabelText('종류'), { target: { value: 'routine' } });
    fireEvent.click(container.querySelector('.todo-item__edit-actions .btn--main') as HTMLElement);
    expect(onUpdate).toHaveBeenCalledWith('t1', expect.objectContaining({ kind: 'routine' }));
  });

  it('연차·휴가는 날짜가 없으면 저장 버튼이 막힌다', () => {
    const { container, getByLabelText, getByRole, onUpdate } = renderItem(makeTodo());
    enterEdit(container);
    fireEvent.change(getByLabelText('종류'), { target: { value: 'leave' } });
    const save = container.querySelector('.todo-item__edit-actions .btn--main') as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    expect(getByRole('alert').textContent).toContain('날짜');
    fireEvent.click(save);
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('편집 폼에서 연차·휴가를 고르면 우선순위·프로젝트·반복 주기 칸이 사라지고 기본값으로 저장된다', () => {
    const { container, getByLabelText, queryByLabelText, onUpdate } = renderItem(
      makeTodo({ priority: 'high', category: '춘천시청', dueDate: '2099-01-01' }),
    );
    enterEdit(container);
    expect(queryByLabelText('우선순위')).not.toBeNull();
    fireEvent.change(getByLabelText('종류'), { target: { value: 'leave' } });
    expect(queryByLabelText('우선순위')).toBeNull();
    expect(queryByLabelText('프로젝트')).toBeNull();
    expect(queryByLabelText('반복 주기')).toBeNull();
    fireEvent.click(container.querySelector('.todo-item__edit-actions .btn--main') as HTMLElement);
    expect(onUpdate).toHaveBeenCalledWith('t1', expect.objectContaining({ kind: 'leave', priority: 'medium', category: '기본', recurrence: undefined }));
  });
});
