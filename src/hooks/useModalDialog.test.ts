import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { RefObject } from 'react';
import { useModalDialog } from './useModalDialog';

// jsdom은 HTMLDialogElement.showModal/close를 구현하지 않으므로 open 속성만 토글하는 모킹을 쓴다.
const showModal = vi.fn(function (this: HTMLDialogElement) { this.setAttribute('open', ''); });
const close = vi.fn(function (this: HTMLDialogElement) { this.removeAttribute('open'); });

function setup(isOpen: boolean) {
  const dialog = document.createElement('dialog');
  document.body.append(dialog);
  const ref = { current: dialog } as RefObject<HTMLDialogElement>;
  const hook = renderHook(({ open }) => useModalDialog(ref, open), { initialProps: { open: isOpen } });
  return { dialog, hook };
}

describe('useModalDialog', () => {
  beforeEach(() => {
    showModal.mockClear();
    close.mockClear();
    Object.assign(HTMLDialogElement.prototype, { showModal, close });
    document.body.style.overflow = '';
  });

  afterEach(() => {
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
    Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
    document.body.innerHTML = '';
    document.body.style.overflow = '';
  });

  it('열리면 모달로 띄우고 배경 스크롤을 잠근다', () => {
    const { dialog } = setup(true);
    expect(showModal).toHaveBeenCalledTimes(1);
    expect(dialog.open).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('닫힌 상태로 시작하면 열지 않고 스크롤도 잠그지 않는다', () => {
    setup(false);
    expect(showModal).not.toHaveBeenCalled();
    expect(document.body.style.overflow).toBe('');
  });

  it('isOpen이 false가 되면 닫고 스크롤 잠금을 푼다', () => {
    const { dialog, hook } = setup(true);
    hook.rerender({ open: false });
    expect(dialog.open).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });

  it('false에서 true로 바뀌면 그때 열린다', () => {
    const { dialog, hook } = setup(false);
    hook.rerender({ open: true });
    expect(dialog.open).toBe(true);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('이미 열려 있으면 showModal을 다시 호출하지 않는다', () => {
    const dialog = document.createElement('dialog');
    dialog.setAttribute('open', '');
    document.body.append(dialog);
    const ref = { current: dialog } as RefObject<HTMLDialogElement>;
    renderHook(() => useModalDialog(ref, true));
    expect(showModal).not.toHaveBeenCalled();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('열린 채 언마운트되면 닫고 스크롤 잠금을 푼다', () => {
    const { dialog, hook } = setup(true);
    hook.unmount();
    expect(dialog.open).toBe(false);
    expect(document.body.style.overflow).toBe('');
  });

  describe('바깥(backdrop) 클릭', () => {
    function setupWithClose() {
      const onClose = vi.fn();
      const dialog = document.createElement('dialog');
      const inner = document.createElement('div');
      dialog.append(inner);
      document.body.append(dialog);
      const ref = { current: dialog } as RefObject<HTMLDialogElement>;
      const { result } = renderHook(() => useModalDialog(ref, true, onClose));
      const click = (target: Element) => result.current({ target } as unknown as React.MouseEvent<HTMLDialogElement>);
      return { dialog, inner, onClose, click };
    }

    it('dialog 자체(어두운 바깥)를 누르면 onClose를 부른다', () => {
      const { dialog, onClose, click } = setupWithClose();
      click(dialog);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('안쪽 내용을 누르면 닫지 않는다', () => {
      const { inner, onClose, click } = setupWithClose();
      click(inner);
      expect(onClose).not.toHaveBeenCalled();
    });

    it('onClose를 안 넘기면 눌러도 아무 일 없다', () => {
      const dialog = document.createElement('dialog');
      document.body.append(dialog);
      const ref = { current: dialog } as RefObject<HTMLDialogElement>;
      const { result } = renderHook(() => useModalDialog(ref, true));
      expect(() => result.current({ target: dialog } as unknown as React.MouseEvent<HTMLDialogElement>)).not.toThrow();
    });
  });
});
