import { useLayoutEffect } from 'react';
import type { RefObject } from 'react';

const MARGIN = 16;

// 절대 위치 팝업이 좁은 화면에서 가로로 잘리지 않게, 열릴 때 화면 안으로 밀어 넣는다.
// 팝업은 `left: 0`(트리거 기준)이 기본이고, 화면 밖으로 나가는 만큼만 `left`를 조정한다.
export function useKeepInViewport(ref: RefObject<HTMLElement | null>, open: boolean) {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!open || !el) return;
    function fit() {
      if (!el) return;
      el.style.left = '';
      const rect = el.getBoundingClientRect();
      const viewport = document.documentElement.clientWidth;
      let shift = 0;
      if (rect.right > viewport - MARGIN) shift = viewport - MARGIN - rect.right;
      if (rect.left + shift < MARGIN) shift = MARGIN - rect.left;
      if (shift !== 0) el.style.left = `${shift}px`;
    }
    fit();
    window.addEventListener('resize', fit);
    return () => {
      window.removeEventListener('resize', fit);
      el.style.left = '';
    };
  }, [ref, open]);
}
