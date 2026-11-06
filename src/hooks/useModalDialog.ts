import { useEffect } from 'react';
import type { MouseEvent, RefObject } from 'react';

// 열린 모달 수와, 첫 모달이 열리기 전의 body overflow 값. 모달이 겹쳐 열려도(설정 위 확인창)
// 자식만 닫았을 때 부모가 아직 열려 있으면 스크롤 잠금을 유지하고, 마지막 모달이 닫힐 때만 원래 값으로 되돌린다.
let openCount = 0;
let savedOverflow = '';

function lockScroll() {
  if (openCount === 0) savedOverflow = document.body.style.overflow;
  openCount += 1;
  document.body.style.overflow = 'hidden';
}

function unlockScroll() {
  openCount = Math.max(0, openCount - 1);
  if (openCount === 0) document.body.style.overflow = savedOverflow;
}

// <dialog>를 모달로 열고 닫으면서 배경 스크롤을 잠근다.
// 마운트될 때만 열리는 모달(ConfirmModal 등)은 isOpen에 true를 넘기면 된다.
// 돌려주는 함수를 <dialog onClick>에 달면 어두운 바깥(backdrop)을 눌렀을 때 onClose가 불린다.
export function useModalDialog(dialogRef: RefObject<HTMLDialogElement>, isOpen: boolean, onClose?: () => void) {
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!isOpen) {
      dialog?.close(); // 닫힌 모달은 잠금에 손대지 않는다 (다른 열린 모달의 잠금을 풀면 안 된다)
      return;
    }
    if (dialog && !dialog.open) dialog.showModal();
    lockScroll();
    return () => {
      unlockScroll();
      if (dialog?.open) dialog.close();
    };
  }, [dialogRef, isOpen]);

  return function handleBackdropClick(e: MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) onClose?.();
  };
}
