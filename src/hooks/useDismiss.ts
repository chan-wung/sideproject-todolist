import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

// 열려 있는 팝오버/메뉴 바깥을 누르면(옵션으로 Esc도) onClose를 호출한다.
// Esc로 닫을 때는 focusRef(보통 팝오버를 연 버튼)로 포커스를 돌려주고, 그 Esc가 바깥 모달까지 닫지 않게 막는다.
export function useDismiss(
  ref: RefObject<HTMLElement>,
  open: boolean,
  onClose: () => void,
  { escape = true, focusRef }: { escape?: boolean; focusRef?: RefObject<HTMLElement> } = {}
) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onCloseRef.current();
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key !== 'Escape' || e.isComposing) return;
      e.preventDefault(); // 팝오버를 연 채 <dialog> 안에 있을 때 Esc가 창 전체를 닫지 않게 한다
      onCloseRef.current();
      focusRef?.current?.focus();
    }
    document.addEventListener('mousedown', handlePointerDown);
    if (escape) document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      if (escape) document.removeEventListener('keydown', handleEscape);
    };
  }, [ref, open, escape, focusRef]);
}
