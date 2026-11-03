import { useRef } from 'react';
import { useModalDialog } from '../hooks/useModalDialog';

interface Props {
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ message, onConfirm, onCancel }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // 마운트되면 바로 열린다. Escape로 닫힐 때의 상태 동기화는 <dialog onCancel>로 위임
  useModalDialog(dialogRef, true);

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) onCancel();
  }

  return (
    <dialog ref={dialogRef} className="confirm-modal" onClick={handleBackdropClick} onCancel={onCancel}>
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
