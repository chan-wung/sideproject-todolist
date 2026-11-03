import { useEffect } from 'react';
import type { RefObject } from 'react';

// <dialog>를 모달로 열고 닫으면서 배경 스크롤을 잠근다.
// 마운트될 때만 열리는 모달(ConfirmModal 등)은 isOpen에 true를 넘기면 된다.
export function useModalDialog(dialogRef: RefObject<HTMLDialogElement>, isOpen: boolean) {
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
}
