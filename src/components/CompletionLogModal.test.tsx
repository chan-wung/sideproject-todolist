import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import CompletionLogModal from './CompletionLogModal';
import type { CompletionLogEntry } from '../types/todo';

const ENTRIES: CompletionLogEntry[] = [
  { id: 'a', text: '잘못 완료한 일', category: '가나시청', priority: 'medium', completedAt: '2026-11-03T10:00:00' },
  { id: 'b', text: '제대로 한 일', category: '다라시스템', priority: 'high', completedAt: '2026-11-03T11:00:00' },
];

function setup(entries: CompletionLogEntry[] = ENTRIES) {
  const handlers = {
    onClose: vi.fn(), onReset: vi.fn(), onDeleteEntry: vi.fn(),
    onCopyEntry: vi.fn(), onShareEntry: vi.fn(), onCopyAll: vi.fn(), onShareAll: vi.fn(), onKakaoShareAll: vi.fn(),
  };
  const props: ComponentProps<typeof CompletionLogModal> = { isOpen: true, entries, ...handlers };
  const utils = render(<CompletionLogModal {...props} />);
  return { ...utils, ...handlers };
}

describe('CompletionLogModal — 이력 한 건 삭제', () => {
  beforeEach(() => {
    // jsdom은 showModal/close 미구현 — open 속성만 토글하는 모킹
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

  it('항목마다 삭제 버튼이 있다', () => {
    const { getAllByRole } = setup();
    expect(getAllByRole('button', { name: '이 이력 삭제' })).toHaveLength(2);
  });

  it('삭제 버튼을 누르면 확인창이 뜨고, 확인하면 그 항목만 지우도록 알린다', () => {
    const { getAllByRole, getByRole, getByText, onDeleteEntry } = setup();
    fireEvent.click(getAllByRole('button', { name: '이 이력 삭제' })[0]);

    expect(getByText(/잘못 완료한 일.*이력을 삭제할까요/)).toBeTruthy();
    expect(onDeleteEntry).not.toHaveBeenCalled(); // 확인 전에는 지우지 않는다

    fireEvent.click(getByRole('button', { name: '삭제' }));
    expect(onDeleteEntry).toHaveBeenCalledTimes(1);
    expect(onDeleteEntry).toHaveBeenCalledWith(ENTRIES[0]);
  });

  it('확인창에서 취소하면 지우지 않는다', () => {
    const { getAllByRole, getByRole, queryByText, onDeleteEntry } = setup();
    fireEvent.click(getAllByRole('button', { name: '이 이력 삭제' })[1]);
    fireEvent.click(getByRole('button', { name: '취소' }));

    expect(onDeleteEntry).not.toHaveBeenCalled();
    expect(queryByText(/이력을 삭제할까요/)).toBeNull();
  });

  it('이력 전체 삭제는 기존처럼 따로 동작한다', () => {
    const { getByRole, getByText, onReset, onDeleteEntry } = setup();
    fireEvent.click(getByRole('button', { name: '이력 전체 삭제' }));
    const confirm = getByText(/전부 삭제할까요/).closest('dialog') as HTMLElement;
    fireEvent.click(within(confirm).getByRole('button', { name: '삭제' }));

    expect(onReset).toHaveBeenCalledTimes(1);
    expect(onDeleteEntry).not.toHaveBeenCalled();
  });
});
