import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import type { ComponentProps } from 'react';
import TodoInput from './TodoInput';
import TodoItem from './TodoItem';
import type { Todo } from '../types/todo';

// 한글 조합 중 Enter는 확정 키다: keyCode 229 / isComposing=true
const composingEnter = { key: 'Enter', isComposing: true, keyCode: 229 };
const enter = { key: 'Enter' };

const TODO: Todo = { id: 't1', text: '보고서', completed: false, priority: 'medium', category: '업무', createdAt: '2026-07-01T09:00:00' };

function setupItem() {
  const onUpdate = vi.fn();
  const onAddSubtask = vi.fn();
  const onUpdateSubtask = vi.fn();
  const props: ComponentProps<typeof TodoItem> = {
    todo: { ...TODO, subtasks: [{ id: 's1', text: '자료', completed: false }] },
    categories: ['업무'], memos: [],
    onToggleSelect: vi.fn(), onToggleSubtasksCollapsed: vi.fn(), onToggle: vi.fn(), onDelete: vi.fn(), onPin: vi.fn(),
    onCopy: vi.fn(), onShare: vi.fn(), onKakaoShare: vi.fn(), onDuplicate: vi.fn(), onUpdate,
    onAddSubtask, onToggleSubtask: vi.fn(), onDeleteSubtask: vi.fn(), onUpdateSubtask, onReorderSubtasks: vi.fn(), onOpenMemo: vi.fn(),
  };
  const utils = render(<TodoItem {...props} />);
  return { ...utils, onUpdate, onAddSubtask, onUpdateSubtask };
}

describe('한글 입력(IME) 조합 중 Enter', () => {
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

  it('할 일 입력창: 조합 중 Enter는 등록하지 않고, 조합이 끝난 Enter는 등록한다', () => {
    const onAdd = vi.fn();
    const { getByPlaceholderText } = render(<TodoInput onAdd={onAdd} categories={[]} />);
    const field = getByPlaceholderText(/크게 할 일을 입력하세요/) as HTMLTextAreaElement;
    fireEvent.change(field, { target: { value: '한글' } });

    fireEvent.keyDown(field, composingEnter);
    expect(onAdd).not.toHaveBeenCalled();

    fireEvent.keyDown(field, { ...enter, shiftKey: true }); // 줄바꿈은 등록이 아니다
    expect(onAdd).not.toHaveBeenCalled();

    fireEvent.keyDown(field, enter);
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd.mock.calls[0][0]).toBe('한글');
  });

  it('카드 수정 폼: 조합 중 Enter는 저장하지 않는다', () => {
    const { getByLabelText, container, onUpdate } = setupItem();
    fireEvent.click(getByLabelText('수정'));
    const field = container.querySelector('textarea.todo-item__edit-field') as HTMLTextAreaElement;

    fireEvent.keyDown(field, composingEnter);
    expect(onUpdate).not.toHaveBeenCalled();
    fireEvent.keyDown(field, enter);
    expect(onUpdate).toHaveBeenCalledTimes(1);
  });

  it('하위 항목 추가·수정 입력: 조합 중 Enter는 확정하지 않는다', () => {
    const { getByPlaceholderText, getByLabelText, container, onAddSubtask, onUpdateSubtask } = setupItem();
    const add = getByPlaceholderText('하위 항목 추가');
    fireEvent.change(add, { target: { value: '새 항목' } });
    fireEvent.keyDown(add, composingEnter);
    expect(onAddSubtask).not.toHaveBeenCalled();
    fireEvent.keyDown(add, enter);
    expect(onAddSubtask).toHaveBeenCalledWith('t1', '새 항목');

    fireEvent.click(getByLabelText('하위 항목 수정'));
    const edit = container.querySelector('.todo-item__sub-edit input') as HTMLInputElement;
    fireEvent.change(edit, { target: { value: '고친 항목' } });
    fireEvent.keyDown(edit, composingEnter);
    expect(onUpdateSubtask).not.toHaveBeenCalled();
    fireEvent.keyDown(edit, enter);
    expect(onUpdateSubtask).toHaveBeenCalledWith('t1', 's1', '고친 항목');
  });
});

describe('작성 중 내용 보존', () => {
  afterEach(cleanup);

  it('하위 항목 입력: 부모 카드를 편집했다가 취소해도 쓰던 글이 남는다', () => {
    const { getByPlaceholderText, getByLabelText, getByText } = setupItem();
    fireEvent.change(getByPlaceholderText('하위 항목 추가'), { target: { value: '쓰던 중' } });

    fireEvent.click(getByLabelText('수정'));
    fireEvent.click(getByText('취소'));

    expect((getByPlaceholderText('하위 항목 추가') as HTMLInputElement).value).toBe('쓰던 중');
  });

  it('할 일 입력: draft를 밖에서 주면 다시 그려도(화면 이동 뒤 복귀) 값이 유지되고, 등록하면 비워진다', () => {
    const onAdd = vi.fn();
    let draft: ComponentProps<typeof TodoInput>['draft'];
    const onDraftChange = vi.fn((d: NonNullable<typeof draft>) => { draft = d; });
    const { getByPlaceholderText, unmount } = render(<TodoInput onAdd={onAdd} categories={[]} draft={undefined} onDraftChange={onDraftChange} />);
    fireEvent.change(getByPlaceholderText(/크게 할 일을/), { target: { value: '쓰던 글' } });
    expect(draft!.text).toBe('쓰던 글');
    unmount();

    const again = render(<TodoInput onAdd={onAdd} categories={[]} draft={draft} onDraftChange={onDraftChange} />);
    const field = again.getByPlaceholderText(/크게 할 일을/) as HTMLTextAreaElement;
    expect(field.value).toBe('쓰던 글');

    fireEvent.keyDown(field, enter);
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(draft!.text).toBe(''); // 등록 성공 뒤 초안 삭제
  });
});
