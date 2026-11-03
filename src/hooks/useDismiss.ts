import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';

// 열려 있는 팝오버/메뉴 바깥을 누르면(옵션으로 Esc도) onClose를 호출한다.
export function useDismiss(
  ref: RefObject<HTMLElement>,
  open: boolean,
  onClose: () => void,
  { escape = true }: { escape?: boolean } = {}
) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onCloseRef.current();
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onCloseRef.current();
    }
    document.addEventListener('mousedown', handlePointerDown);
    if (escape) document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      if (escape) document.removeEventListener('keydown', handleEscape);
    };
  }, [ref, open, escape]);
}
