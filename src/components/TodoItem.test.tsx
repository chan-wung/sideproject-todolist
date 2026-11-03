// TodoItem 리팩터링(컴포넌트 분리) 전에 현재 렌더 결과와 동작을 고정하는 특성화 테스트.
// 분리 후에도 이 파일을 수정하지 않고 모두 통과해야 한다.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import TodoItem from './TodoItem';
import type { Todo } from '../types/todo';
import type { Memo } from '../hooks/useMemos';

type Props = ComponentProps<typeof TodoItem>;

const MEMOS: Memo[] = [
  { id: 'm1', title: '회의록', content: '' },
  { id: 'm2', title: '', content: '' },
];

const SUBTASKS: NonNullable<Todo['subtasks']> = [
  { id: 's1', text: '자료 수집', completed: true },
  { id: 's2', text: '초안 작성', completed: false },
  { id: 's3', text: '검토 요청', completed: false },
];

function makeTodo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 't1',
    text: '보고서 작성',
    completed: false,
    priority: 'medium',
    category: '업무',
    createdAt: '2026-07-01T09:00:00',
    dueDate: '2099-01-01',
    ...overrides,
  };
}

function setup(todoOverrides: Partial<Todo> = {}, propOverrides: Partial<Props> = {}) {
  const handlers = {
    onToggleSelect: vi.fn(),
    onToggleSubtasksCollapsed: vi.fn(),
    onToggle: vi.fn(),
    onDelete: vi.fn(),
    onPin: vi.fn(),
    onCopy: vi.fn(),
    onShare: vi.fn(),
    onKakaoShare: vi.fn(),
    onDuplicate: vi.fn(),
    onUpdate: vi.fn(),
    onAddSubtask: vi.fn(),
    onToggleSubtask: vi.fn(),
    onDeleteSubtask: vi.fn(),
    onUpdateSubtask: vi.fn(),
    onReorderSubtasks: vi.fn(),
    onOpenMemo: vi.fn(),
  };
  const todo = makeTodo(todoOverrides);
  const props: Props = { todo, categories: ['업무', '개인'], memos: MEMOS, ...handlers, ...propOverrides };
  const utils = render(<TodoItem {...props} />);
  return { ...utils, todo, handlers };
}

// 편집 모드로 들어간다.
function enterEdit(utils: ReturnType<typeof setup>) {
  fireEvent.click(utils.getByLabelText('수정'));
}

const q = <T extends Element = HTMLElement>(root: ParentNode, selector: string) => root.querySelector(selector) as T;

describe('TodoItem', () => {
  beforeEach(() => {
    // jsdom은 showModal/close 미구현 — open 속성만 토글하는 모킹 (ConfirmModal, CategoryPickerModal용)
    Object.assign(HTMLDialogElement.prototype, {
      showModal(this: HTMLDialogElement) { this.setAttribute('open', ''); },
      close(this: HTMLDialogElement) { this.removeAttribute('open'); },
    });
  });

  afterEach(() => {
    cleanup();
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
    document.body.style.overflow = '';
  });

  describe('렌더 스냅샷', () => {
    it('기본 보기 모드', () => {
      const { container } = setup();
      expect(container).toMatchSnapshot();
    });

    it('완료 + 고정', () => {
      const { container } = setup({ completed: true, pinned: true });
      expect(container).toMatchSnapshot();
    });

    it('기한 초과', () => {
      const { container } = setup({ dueDate: '2020-01-01', priority: 'high' });
      expect(container).toMatchSnapshot();
    });

    it('하위 항목 + 연결 메모 + 반복 시리즈 소속', () => {
      const { container } = setup({ subtasks: SUBTASKS, memoIds: ['m1', 'm2'], seriesId: 'series-1' });
      expect(container).toMatchSnapshot();
    });

    it('하위 항목 접힘 + 레거시 반복 배지', () => {
      const { container } = setup({ subtasks: SUBTASKS, subtasksCollapsed: true, recurrence: 'weekly', priority: 'low' });
      expect(container).toMatchSnapshot();
    });

    it('선택 모드(선택됨) + 수동 정렬', () => {
      const { container } = setup({}, { selectionMode: true, isSelected: true, manualSort: true });
      expect(container).toMatchSnapshot();
    });

    it('더보기 메뉴 열림', () => {
      const utils = setup();
      fireEvent.click(utils.getByLabelText('더보기'));
      expect(utils.container).toMatchSnapshot();
    });

    it('편집 모드', () => {
      const utils = setup({ memoIds: ['m1'], recurrence: 'monthly' });
      enterEdit(utils);
      expect(utils.container).toMatchSnapshot();
    });

    it('편집 모드 — 반복 시리즈 회차', () => {
      const utils = setup({ seriesId: 'series-1' });
      enterEdit(utils);
      expect(utils.container).toMatchSnapshot();
    });
  });

  describe('보기 모드 동작', () => {
    it('완료 체크박스는 onToggle(id)를 호출한다', () => {
      const { container, handlers } = setup();
      fireEvent.click(q(container, '.todo-item__check input'));
      expect(handlers.onToggle).toHaveBeenCalledWith('t1');
    });

    it('고정 버튼은 onPin(id)를 호출한다', () => {
      const { getByLabelText, handlers } = setup();
      fireEvent.click(getByLabelText('상단 고정'));
      expect(handlers.onPin).toHaveBeenCalledWith('t1');
    });

    it('고정된 항목의 버튼 라벨은 고정 해제다', () => {
      const { getByLabelText } = setup({ pinned: true });
      expect(getByLabelText('고정 해제')).toBeTruthy();
    });

    it('연결된 메모 버튼은 onOpenMemo(memoId)를 호출한다', () => {
      const { getByText, handlers } = setup({ memoIds: ['m1'] });
      fireEvent.click(getByText('📎 회의록'));
      expect(handlers.onOpenMemo).toHaveBeenCalledWith('m1');
    });

    it('제목이 비어 있는 메모는 "제목 없음"으로 표시한다', () => {
      const { getByText } = setup({ memoIds: ['m2'] });
      expect(getByText('📎 제목 없음')).toBeTruthy();
    });

    it('삭제된 메모를 가리키는 id는 표시하지 않는다', () => {
      const { container } = setup({ memoIds: ['missing'] });
      expect(container.querySelectorAll('.todo-item__memo-link:not(.todo-item__memo-link--empty)').length).toBe(0);
    });

    it('"메모 연결" 버튼을 누르면 편집 모드로 들어간다', () => {
      const { getByLabelText, container } = setup();
      fireEvent.click(getByLabelText('메모 연결'));
      expect(q(container, '.todo-item__edit-field--textarea')).toBeTruthy();
    });

    it('선택 모드에서 체크박스는 onToggleSelect(id)를 호출한다', () => {
      const { container, handlers } = setup({}, { selectionMode: true });
      fireEvent.click(q(container, '.todo-item__select input'));
      expect(handlers.onToggleSelect).toHaveBeenCalledWith('t1');
    });

    it('하위 항목 접기 버튼은 onToggleSubtasksCollapsed(id)를 호출한다', () => {
      const { container, handlers } = setup({ subtasks: SUBTASKS });
      fireEvent.click(q(container, '.todo-item__sub-toggle'));
      expect(handlers.onToggleSubtasksCollapsed).toHaveBeenCalledWith('t1');
    });
  });

  describe('더보기 메뉴', () => {
    it('열면 4개 항목이 보이고 aria-expanded가 바뀐다', () => {
      const { getByLabelText, getAllByRole } = setup();
      const btn = getByLabelText('더보기');
      expect(btn.getAttribute('aria-expanded')).toBe('false');
      fireEvent.click(btn);
      expect(btn.getAttribute('aria-expanded')).toBe('true');
      expect(getAllByRole('menuitem').map(el => el.textContent)).toEqual(['클립보드에 복사', '공유', '카카오톡 공유', '할 일 복사']);
    });

    it.each([
      ['클립보드에 복사', 'onCopy', true],
      ['공유', 'onShare', true],
      ['카카오톡 공유', 'onKakaoShare', true],
      ['할 일 복사', 'onDuplicate', false],
    ] as const)('"%s" 선택 시 %s를 호출하고 메뉴를 닫는다', (label, handlerName, withTodo) => {
      const { getByLabelText, getByText, queryByRole, handlers, todo } = setup();
      fireEvent.click(getByLabelText('더보기'));
      fireEvent.click(getByText(label));
      expect(handlers[handlerName]).toHaveBeenCalledWith(withTodo ? todo : 't1');
      expect(queryByRole('menu')).toBeNull();
    });

    it('바깥을 누르면 닫힌다', () => {
      const { getByLabelText, queryByRole } = setup();
      fireEvent.click(getByLabelText('더보기'));
      fireEvent.mouseDown(document.body);
      expect(queryByRole('menu')).toBeNull();
    });

    it('메뉴 안쪽을 눌러서는 닫히지 않는다', () => {
      const { getByLabelText, getByRole } = setup();
      fireEvent.click(getByLabelText('더보기'));
      fireEvent.mouseDown(getByRole('menu'));
      expect(getByRole('menu')).toBeTruthy();
    });

    it('Esc로 닫힌다', () => {
      const { getByLabelText, queryByRole } = setup();
      fireEvent.click(getByLabelText('더보기'));
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(queryByRole('menu')).toBeNull();
    });

    it('더보기 버튼을 다시 누르면 닫힌다', () => {
      const { getByLabelText, queryByRole } = setup();
      fireEvent.click(getByLabelText('더보기'));
      fireEvent.click(getByLabelText('더보기'));
      expect(queryByRole('menu')).toBeNull();
    });
  });

  describe('삭제 확인', () => {
    it('삭제 버튼을 누르면 확인 창이 뜨고, 확인하면 onDelete(id)를 호출한다', () => {
      const { getByLabelText, container, handlers } = setup();
      fireEvent.click(getByLabelText('삭제'));
      expect(q(document.body, 'dialog.confirm-modal').hasAttribute('open')).toBe(true);
      expect(q(document.body, '.confirm-modal__msg').textContent).toBe('"보고서 작성" 을(를) 삭제할까요?');
      fireEvent.click(q(document.body, '.confirm-modal__delete-btn'));
      expect(handlers.onDelete).toHaveBeenCalledWith('t1');
      expect(container.querySelector('dialog.confirm-modal')).toBeNull();
    });

    it('취소하면 onDelete를 호출하지 않고 창이 닫힌다', () => {
      const { getByLabelText, getByText, container, handlers } = setup();
      fireEvent.click(getByLabelText('삭제'));
      fireEvent.click(getByText('취소'));
      expect(handlers.onDelete).not.toHaveBeenCalled();
      expect(container.querySelector('dialog.confirm-modal')).toBeNull();
    });

    it('긴 제목은 20자까지만 보여 준다', () => {
      const { getByLabelText } = setup({ text: '가'.repeat(25) });
      fireEvent.click(getByLabelText('삭제'));
      expect(q(document.body, '.confirm-modal__msg').textContent).toBe(`"${'가'.repeat(20)}…" 을(를) 삭제할까요?`);
    });
  });

  describe('편집 모드', () => {
    it('수정 → 입력 → 저장하면 정리된 값으로 onUpdate를 호출하고 보기 모드로 돌아간다', () => {
      const utils = setup({ memoIds: undefined });
      const { container, getByLabelText, handlers } = utils;
      enterEdit(utils);

      fireEvent.change(q(container, '.todo-item__edit-field--textarea'), { target: { value: '  수정된 제목  ' } });
      fireEvent.change(getByLabelText('우선순위'), { target: { value: 'high' } });
      fireEvent.change(q(container, '#todo-edit-category-t1'), { target: { value: '개인' } });
      fireEvent.change(q(container, '#todo-edit-recurrence-t1'), { target: { value: 'weekly' } });
      fireEvent.click(q(container, '.todo-item__edit-actions .btn--main'));

      expect(handlers.onUpdate).toHaveBeenCalledTimes(1);
      expect(handlers.onUpdate).toHaveBeenCalledWith('t1', {
        text: '수정된 제목',
        priority: 'high',
        dueDate: '2099-01-01',
        category: '개인',
        recurrence: 'weekly',
        memoIds: undefined,
      });
      expect(q(container, '.todo-item__edit-field--textarea')).toBeNull();
    });

    it('카테고리를 비우면 "기본"으로 저장한다', () => {
      const utils = setup();
      enterEdit(utils);
      fireEvent.change(q(utils.container, '#todo-edit-category-t1'), { target: { value: '   ' } });
      fireEvent.click(q(utils.container, '.todo-item__edit-actions .btn--main'));
      expect(utils.handlers.onUpdate).toHaveBeenCalledWith('t1', expect.objectContaining({ category: '기본' }));
    });

    it('제목이 비어 있으면 저장하지 않고 편집 상태를 유지한다', () => {
      const utils = setup();
      enterEdit(utils);
      fireEvent.change(q(utils.container, '.todo-item__edit-field--textarea'), { target: { value: '   ' } });
      fireEvent.click(q(utils.container, '.todo-item__edit-actions .btn--main'));
      expect(utils.handlers.onUpdate).not.toHaveBeenCalled();
      expect(q(utils.container, '.todo-item__edit-field--textarea')).toBeTruthy();
    });

    it('취소하면 변경 없이 보기 모드로 돌아간다', () => {
      const utils = setup();
      enterEdit(utils);
      fireEvent.change(q(utils.container, '.todo-item__edit-field--textarea'), { target: { value: '바뀐 제목' } });
      fireEvent.click(q(utils.container, '.todo-item__edit-actions .btn--outline-gray'));
      expect(utils.handlers.onUpdate).not.toHaveBeenCalled();
      expect(utils.getByText('보고서 작성')).toBeTruthy();
    });

    it('다시 편집을 시작하면 최신 todo 값으로 입력이 초기화된다', () => {
      const utils = setup();
      enterEdit(utils);
      fireEvent.change(q(utils.container, '.todo-item__edit-field--textarea'), { target: { value: '버려질 입력' } });
      fireEvent.click(q(utils.container, '.todo-item__edit-actions .btn--outline-gray'));
      enterEdit(utils);
      expect(q<HTMLTextAreaElement>(utils.container, '.todo-item__edit-field--textarea').value).toBe('보고서 작성');
    });

    it('Enter는 저장하고, Shift+Enter는 저장하지 않으며, Esc는 취소한다', () => {
      const utils = setup();
      enterEdit(utils);
      const area = q(utils.container, '.todo-item__edit-field--textarea');

      fireEvent.keyDown(area, { key: 'Enter', shiftKey: true });
      expect(utils.handlers.onUpdate).not.toHaveBeenCalled();

      fireEvent.keyDown(area, { key: 'Enter' });
      expect(utils.handlers.onUpdate).toHaveBeenCalledTimes(1);

      enterEdit(utils);
      fireEvent.keyDown(q(utils.container, '.todo-item__edit-field--textarea'), { key: 'Escape' });
      expect(q(utils.container, '.todo-item__edit-field--textarea')).toBeNull();
      expect(utils.handlers.onUpdate).toHaveBeenCalledTimes(1);
    });

    it('연결 메모 체크박스를 켜고 끌 수 있다', () => {
      const utils = setup();
      enterEdit(utils);
      const boxes = utils.container.querySelectorAll<HTMLInputElement>('.todo-item__memo-checklist input');
      expect(boxes.length).toBe(2);

      fireEvent.click(boxes[0]);
      fireEvent.click(q(utils.container, '.todo-item__edit-actions .btn--main'));
      expect(utils.handlers.onUpdate).toHaveBeenLastCalledWith('t1', expect.objectContaining({ memoIds: ['m1'] }));
    });

    it('연결된 메모를 모두 해제하면 memoIds는 undefined로 저장한다', () => {
      const utils = setup({ memoIds: ['m1'] });
      enterEdit(utils);
      fireEvent.click(utils.container.querySelectorAll('.todo-item__memo-checklist input')[0]);
      fireEvent.click(q(utils.container, '.todo-item__edit-actions .btn--main'));
      expect(utils.handlers.onUpdate).toHaveBeenLastCalledWith('t1', expect.objectContaining({ memoIds: undefined }));
    });

    it('메모가 없으면 안내 문구를 보여 준다', () => {
      const utils = setup({}, { memos: [] });
      enterEdit(utils);
      expect(utils.getByText('메모 없음')).toBeTruthy();
    });

    it('반복 시리즈 회차는 반복 주기 select 대신 안내 문구를 보여 준다', () => {
      const utils = setup({ seriesId: 'series-1' });
      enterEdit(utils);
      expect(q(utils.container, '#todo-edit-recurrence-t1')).toBeNull();
      expect(utils.getByText(/반복 일정에 속한 회차입니다/)).toBeTruthy();
    });

    it('카테고리 추천 버튼을 누르면 입력값이 바뀐다', () => {
      const utils = setup();
      enterEdit(utils);
      fireEvent.click(q(utils.container, '.todo-item__category-suggest-btn:not(.todo-item__category-suggest-btn--active)'));
      expect(q<HTMLInputElement>(utils.container, '#todo-edit-category-t1').value).toBe('개인');
    });

    it('카테고리 선택 창에서 고르고 적용하면 입력값이 바뀐다', () => {
      const utils = setup();
      enterEdit(utils);
      fireEvent.click(utils.getByText('카테고리 선택'));

      const dialog = q(document.body, 'dialog.category-picker-modal');
      expect(dialog.hasAttribute('open')).toBe(true);
      fireEvent.click(within(dialog).getByLabelText('개인'));
      fireEvent.click(within(dialog).getByText('적용'));

      expect(q(document.body, 'dialog.category-picker-modal')).toBeNull();
      expect(q<HTMLInputElement>(utils.container, '#todo-edit-category-t1').value).toBe('개인');
    });

    it('카테고리가 하나도 없으면 추천 영역과 선택 버튼을 보여 주지 않는다', () => {
      const utils = setup({}, { categories: [] });
      enterEdit(utils);
      expect(q(utils.container, '.todo-item__category-suggest')).toBeNull();
      expect(q(utils.container, '.todo-item__category-picker-btn')).toBeNull();
    });
  });

  describe('하위 항목', () => {
    it('입력 후 Enter로 추가하고 입력창을 비운다', () => {
      const { getByPlaceholderText, handlers } = setup();
      const input = getByPlaceholderText('하위 항목 추가') as HTMLInputElement;
      fireEvent.change(input, { target: { value: '새 하위 항목' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(handlers.onAddSubtask).toHaveBeenCalledWith('t1', '새 하위 항목');
      expect(input.value).toBe('');
    });

    it('추가 버튼으로도 추가하며, 빈 입력은 무시한다', () => {
      const { getByPlaceholderText, getByLabelText, handlers } = setup();
      fireEvent.click(getByLabelText('하위 항목 추가'));
      expect(handlers.onAddSubtask).not.toHaveBeenCalled();

      fireEvent.change(getByPlaceholderText('하위 항목 추가'), { target: { value: '버튼으로 추가' } });
      fireEvent.click(getByLabelText('하위 항목 추가'));
      expect(handlers.onAddSubtask).toHaveBeenCalledWith('t1', '버튼으로 추가');
    });

    it('체크박스는 onToggleSubtask(todoId, subId)를 호출한다', () => {
      const { container, handlers } = setup({ subtasks: SUBTASKS });
      fireEvent.click(container.querySelectorAll('.todo-item__sub-chk')[1]);
      expect(handlers.onToggleSubtask).toHaveBeenCalledWith('t1', 's2');
    });

    it('삭제 버튼은 onDeleteSubtask(todoId, subId)를 호출한다', () => {
      const { getAllByLabelText, handlers } = setup({ subtasks: SUBTASKS });
      fireEvent.click(getAllByLabelText('서브태스크 삭제')[2]);
      expect(handlers.onDeleteSubtask).toHaveBeenCalledWith('t1', 's3');
    });

    it('수정 버튼 → 입력 → Enter로 onUpdateSubtask를 호출하고 편집을 마친다', () => {
      const { container, getAllByLabelText, handlers } = setup({ subtasks: SUBTASKS });
      fireEvent.click(getAllByLabelText('하위 항목 수정')[0]);
      const input = q<HTMLInputElement>(container, '.todo-item__sub-edit input');
      expect(input.value).toBe('자료 수집');

      fireEvent.change(input, { target: { value: '자료 정리' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(handlers.onUpdateSubtask).toHaveBeenCalledWith('t1', 's1', '자료 정리');
      expect(q(container, '.todo-item__sub-edit')).toBeNull();
    });

    it('수정 중 Esc 또는 취소 버튼으로 취소한다', () => {
      const { container, getAllByLabelText, getByLabelText, handlers } = setup({ subtasks: SUBTASKS });
      fireEvent.click(getAllByLabelText('하위 항목 수정')[0]);
      fireEvent.keyDown(q(container, '.todo-item__sub-edit input'), { key: 'Escape' });
      expect(q(container, '.todo-item__sub-edit')).toBeNull();

      fireEvent.click(getAllByLabelText('하위 항목 수정')[1]);
      fireEvent.click(getByLabelText('취소'));
      expect(q(container, '.todo-item__sub-edit')).toBeNull();
      expect(handlers.onUpdateSubtask).not.toHaveBeenCalled();
    });

    it('수정 중 저장 버튼으로 저장한다', () => {
      const { container, getAllByLabelText, getByLabelText, handlers } = setup({ subtasks: SUBTASKS });
      fireEvent.click(getAllByLabelText('하위 항목 수정')[1]);
      fireEvent.change(q(container, '.todo-item__sub-edit input'), { target: { value: '초안 보완' } });
      fireEvent.click(getByLabelText('저장'));
      expect(handlers.onUpdateSubtask).toHaveBeenCalledWith('t1', 's2', '초안 보완');
    });

    it('빈 값으로는 저장되지 않고 편집 상태가 유지된다', () => {
      const { container, getAllByLabelText, handlers } = setup({ subtasks: SUBTASKS });
      fireEvent.click(getAllByLabelText('하위 항목 수정')[0]);
      const input = q(container, '.todo-item__sub-edit input');
      fireEvent.change(input, { target: { value: '  ' } });
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(handlers.onUpdateSubtask).not.toHaveBeenCalled();
      expect(q(container, '.todo-item__sub-edit')).toBeTruthy();
    });

    it('드래그로 순서를 바꾸면 onReorderSubtasks(todoId, from, to)를 호출한다', () => {
      const { container, handlers } = setup({ subtasks: SUBTASKS });
      const rows = container.querySelectorAll('.todo-item__subtask');

      fireEvent.dragStart(rows[0]);
      fireEvent.dragOver(rows[2]);
      expect(rows[2].classList.contains('todo-item__subtask--drag-over')).toBe(true);
      fireEvent.drop(rows[2]);

      expect(handlers.onReorderSubtasks).toHaveBeenCalledWith('t1', 0, 2);
      expect(rows[2].classList.contains('todo-item__subtask--drag-over')).toBe(false);
    });

    it('같은 위치에 놓거나 드래그가 취소되면 호출하지 않는다', () => {
      const { container, handlers } = setup({ subtasks: SUBTASKS });
      const rows = container.querySelectorAll('.todo-item__subtask');

      fireEvent.dragStart(rows[1]);
      fireEvent.drop(rows[1]);
      fireEvent.dragStart(rows[0]);
      fireEvent.dragEnd(rows[0]);
      fireEvent.drop(rows[2]);
      expect(handlers.onReorderSubtasks).not.toHaveBeenCalled();
    });

    it('수정 중인 행은 드래그할 수 없다', () => {
      const { container, getAllByLabelText } = setup({ subtasks: SUBTASKS });
      fireEvent.click(getAllByLabelText('하위 항목 수정')[0]);
      const rows = container.querySelectorAll('.todo-item__subtask');
      expect(rows[0].getAttribute('draggable')).toBe('false');
      expect(rows[1].getAttribute('draggable')).toBe('true');
    });
  });
});
