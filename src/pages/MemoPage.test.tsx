import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup, within } from '@testing-library/react';
import MemoPage from './MemoPage';
import type { Memo } from '../hooks/useMemos';
import type { Todo } from '../types/todo';

const MEMOS: Memo[] = [
  { id: 'm1', title: '서버 계정', content: '아이디: test' },
  { id: 'm2', title: '회의록', content: '11월 첫째 주' },
  { id: 'm3', title: '링크 모음', content: '' },
];

const TODOS: Todo[] = [
  { id: 't1', text: '서버 점검', completed: false, priority: 'medium', category: '기본', createdAt: '2026-11-01T09:00:00', memoIds: ['m1'] },
  { id: 't2', text: '보고서 작성', completed: false, priority: 'medium', category: '기본', createdAt: '2026-11-01T09:00:00' },
];

function setup(props: Partial<React.ComponentProps<typeof MemoPage>> = {}) {
  const handlers = {
    setMemos: vi.fn(), setActiveId: vi.fn(), onLinkMemo: vi.fn(), onUnlinkMemo: vi.fn(),
    onCopyText: vi.fn(), onShareText: vi.fn(), onKakaoShareText: vi.fn(),
  };
  const utils = render(<MemoPage memos={MEMOS} activeId="m1" todos={TODOS} {...handlers} {...props} />);
  const list = () => utils.container.querySelector('.memo-page__list') as HTMLElement;
  return { ...utils, ...handlers, list };
}

describe('MemoPage', () => {
  beforeEach(() => {
    // jsdom은 showModal/close 미구현 — ConfirmModal용 모킹
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

  it('메모 목록과 고른 메모의 제목·내용을 보여 주고, 더 이상 팝업이 아니다', () => {
    const { container, list, getByDisplayValue, getByText } = setup();
    expect(getByText('메모장')).toBeTruthy();
    expect(container.querySelector('dialog')).toBeNull();
    expect(within(list()).getAllByRole('listitem')).toHaveLength(3);
    expect(getByDisplayValue('서버 계정')).toBeTruthy();
    expect(getByDisplayValue('아이디: test')).toBeTruthy();
    expect(list().querySelector('.memo-page__item--active')?.textContent).toContain('서버 계정');
  });

  it('화면 제목은 h1 하나다', () => {
    const { getAllByRole } = setup();
    const h1 = getAllByRole('heading', { level: 1 });
    expect(h1).toHaveLength(1);
    expect(h1[0].textContent).toBe('메모장');
  });

  it('목록에서 다른 메모를 누르면 그 메모를 고른다', () => {
    const { list, setActiveId } = setup();
    fireEvent.click(within(list()).getByText('회의록'));
    expect(setActiveId).toHaveBeenCalledWith('m2');
  });

  it('연결된 할 일이 있는 메모에는 개수를 표시한다', () => {
    const { list } = setup();
    expect(within(list()).getByLabelText('연결된 할 일 1개')).toBeTruthy();
  });

  it('제목과 내용을 고치면 그 메모만 바꿔 저장한다', () => {
    const { getByDisplayValue, setMemos } = setup();
    fireEvent.change(getByDisplayValue('서버 계정'), { target: { value: '서버 계정 (운영)' } });
    expect(setMemos).toHaveBeenLastCalledWith([{ ...MEMOS[0], title: '서버 계정 (운영)' }, MEMOS[1], MEMOS[2]]);

    fireEvent.change(getByDisplayValue('아이디: test'), { target: { value: '새 내용' } });
    expect(setMemos).toHaveBeenLastCalledWith([{ ...MEMOS[0], content: '새 내용' }, MEMOS[1], MEMOS[2]]);
  });

  it('새 메모 추가: 목록 끝에 붙이고 그 메모를 고른다', () => {
    const { getByRole, setMemos, setActiveId } = setup();
    fireEvent.click(getByRole('button', { name: '+ 새 메모 추가' }));
    const saved = setMemos.mock.calls[0][0] as Memo[];
    expect(saved).toHaveLength(4);
    expect(saved[3]).toMatchObject({ title: '새 메모', content: '' });
    expect(setActiveId).toHaveBeenCalledWith(saved[3].id);
  });

  it('검색은 제목으로 목록을 걸러 낸다', () => {
    const { getByLabelText, list } = setup();
    fireEvent.change(getByLabelText('메모 검색'), { target: { value: '회의' } });
    const items = within(list()).getAllByRole('listitem');
    expect(items).toHaveLength(1);
    expect(items[0].textContent).toContain('회의록');
  });

  it('메모 삭제: 확인창에서 확인해야 지우고, 취소하면 지우지 않는다', () => {
    const { list, getByRole, setMemos } = setup();
    const deleteBtns = within(list()).getAllByLabelText('메모 삭제');
    fireEvent.click(deleteBtns[1]);
    fireEvent.click(getByRole('button', { name: '취소' }));
    expect(setMemos).not.toHaveBeenCalled();

    fireEvent.click(deleteBtns[1]);
    expect(document.body.textContent).toContain('"회의록" 메모를 삭제할까요?');
    fireEvent.click(getByRole('button', { name: '삭제' }));
    expect(setMemos).toHaveBeenCalledWith([MEMOS[0], MEMOS[2]]);
  });

  it('메모 고정: 고정한 메모는 맨 앞으로 간다', () => {
    const { list, setMemos } = setup();
    fireEvent.click(within(list()).getAllByLabelText('메모 고정')[2]); // 링크 모음
    expect(setMemos).toHaveBeenCalledWith([{ ...MEMOS[2], pinned: true }, MEMOS[0], MEMOS[1]]);
  });

  it('연결된 할 일: 펼쳐서 체크하면 연결, 이미 연결된 것은 해제를 알린다', () => {
    const { container, getByLabelText, onLinkMemo, onUnlinkMemo } = setup(); // 고른 메모 m1
    fireEvent.click(container.querySelector('.memo-page__linked-toggle') as HTMLElement);
    const linked = getByLabelText('서버 점검') as HTMLInputElement;
    const unlinked = getByLabelText('보고서 작성') as HTMLInputElement;
    expect(linked.checked).toBe(true);
    expect(unlinked.checked).toBe(false);

    fireEvent.click(unlinked);
    expect(onLinkMemo).toHaveBeenCalledWith('t2', 'm1');
    fireEvent.click(linked);
    expect(onUnlinkMemo).toHaveBeenCalledWith('t1', 'm1');
  });

  it('더보기: 복사·공유·카카오톡 공유는 앱 공용 동작으로 넘긴다', () => {
    const { getByRole, getByLabelText, onCopyText, onShareText, onKakaoShareText } = setup();
    const more = () => fireEvent.click(getByLabelText('더보기'));

    more();
    fireEvent.click(getByRole('button', { name: '클립보드 복사' }));
    expect(onCopyText).toHaveBeenCalledWith('서버 계정\n\n아이디: test', '메모를 클립보드에 복사했습니다.');

    more();
    fireEvent.click(getByRole('button', { name: '공유' }));
    expect(onShareText).toHaveBeenCalledWith('서버 계정', '서버 계정\n\n아이디: test');

    more();
    fireEvent.click(getByRole('button', { name: '카카오톡 공유' }));
    expect(onKakaoShareText).toHaveBeenCalledWith('서버 계정\n\n아이디: test');
  });

  it('메모가 하나도 없으면 기본 메모를 만들어 고른다', () => {
    const { setMemos, setActiveId } = setup({ memos: [], activeId: null });
    expect(setMemos).toHaveBeenCalledTimes(1);
    const created = (setMemos.mock.calls[0][0] as Memo[])[0];
    expect(created).toMatchObject({ title: '기본 메모' });
    expect(setActiveId).toHaveBeenCalledWith(created.id);
  });
});
