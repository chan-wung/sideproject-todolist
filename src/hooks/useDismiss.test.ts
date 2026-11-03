import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useDismiss } from './useDismiss';

function setup(open: boolean, options?: { escape?: boolean }) {
  const inside = document.createElement('div');
  const outside = document.createElement('div');
  document.body.append(inside, outside);
  const onClose = vi.fn();
  const ref = { current: inside };
  const hook = renderHook(
    ({ isOpen }) => useDismiss(ref, isOpen, onClose, options),
    { initialProps: { isOpen: open } },
  );
  return { inside, outside, onClose, hook };
}

const mouseDown = (el: Element) => el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
const keyDown = (key: string) => document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));

describe('useDismiss', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('바깥 mousedown이면 onClose를 호출한다', () => {
    const { outside, onClose } = setup(true);
    mouseDown(outside);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('안쪽 mousedown이면 호출하지 않는다', () => {
    const { inside, onClose } = setup(true);
    mouseDown(inside);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('기본값은 Esc에도 반응한다', () => {
    const { onClose } = setup(true);
    keyDown('Escape');
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Esc 이외의 키는 무시한다', () => {
    const { onClose } = setup(true);
    keyDown('Enter');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('escape: false이면 Esc에 반응하지 않고 바깥 클릭만 처리한다', () => {
    const { outside, onClose } = setup(true, { escape: false });
    keyDown('Escape');
    expect(onClose).not.toHaveBeenCalled();
    mouseDown(outside);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('닫힌 상태에서는 아무 이벤트에도 반응하지 않는다', () => {
    const { outside, onClose } = setup(false);
    mouseDown(outside);
    keyDown('Escape');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('열린 뒤에 반응하고, 닫히거나 언마운트되면 리스너를 해제한다', () => {
    const { outside, onClose, hook } = setup(false);
    hook.rerender({ isOpen: true });
    mouseDown(outside);
    expect(onClose).toHaveBeenCalledTimes(1);

    hook.rerender({ isOpen: false });
    mouseDown(outside);
    expect(onClose).toHaveBeenCalledTimes(1);

    hook.rerender({ isOpen: true });
    hook.unmount();
    mouseDown(outside);
    keyDown('Escape');
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
