import { useEffect, useRef } from 'react';

interface Props {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ message, onConfirm, onCancel }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    document.body.style.overflow = 'hidden';

    // Escape 키로 닫힐 때 상태 동기화
    dialog.addEventListener('cancel', onCancel);
    return () => {
      dialog.removeEventListener('cancel', onCancel);
      document.body.style.overflow = '';
      if (!dialog.open) return;
      dialog.close();
    };
  }, [onCancel]);

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) onCancel();
  }

  return (
    <dialog ref={dialogRef} className="confirm-modal" onClick={handleBackdropClick}>
      <div className="confirm-modal__container">
        <p className="confirm-modal__msg">{message}</p>
        <div className="confirm-modal__actions">
          <button className="btn btn--outline-gray btn--sm" type="button" onClick={onCancel}>
            취소
          </button>
          <button className="btn btn--sm confirm-modal__delete-btn" type="button" onClick={onConfirm}>
            삭제
          </button>
        </div>
      </div>
    </dialog>
  );
}
