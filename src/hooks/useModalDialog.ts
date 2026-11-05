import { useEffect } from 'react';
import type { MouseEvent, RefObject } from 'react';

// <dialog>를 모달로 열고 닫으면서 배경 스크롤을 잠근다.
// 마운트될 때만 열리는 모달(ConfirmModal 등)은 isOpen에 true를 넘기면 된다.
// 돌려주는 함수를 <dialog onClick>에 달면 어두운 바깥(backdrop)을 눌렀을 때 onClose가 불린다.
export function useModalDialog(dialogRef: RefObject<HTMLDialogElement>, isOpen: boolean, onClose?: () => void) {
  useEffect(() => {
    const dialog = dialogRef.current;
    if (isOpen) {
      if (dialog && !dialog.open) dialog.showModal();
      document.body.style.overflow = 'hidden';
    } else {
      dialog?.close();
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      if (dialog?.open) dialog.close();
    };
  }, [dialogRef, isOpen]);

  return function handleBackdropClick(e: MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) onClose?.();
  };
}
