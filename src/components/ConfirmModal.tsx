import { useId, useRef } from 'react';
import { useModalDialog } from '../hooks/useModalDialog';

interface Props {
  message: string;
  /** 메시지 아래에 목록으로 보여 줄 안내 줄들 (예: 가져올 구역과 건수) */
  details?: string[];
  /** 확인 버튼 글자. 기본은 '삭제' */
  confirmLabel?: string;
  /** 'danger'(기본, 빨강) 또는 되돌릴 수 있는 확인에 쓰는 'main' */
  confirmTone?: 'danger' | 'main';
  /** 모달을 닫지 않고 누를 수 있는 보조 동작 (예: 현재 데이터 내보내기) */
  extraAction?: { label: string; onClick: () => void };
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ message, details, confirmLabel = '삭제', confirmTone = 'danger', extraAction, onConfirm, onCancel }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const msgId = useId();

  // 마운트되면 바로 열린다. Escape로 닫힐 때의 상태 동기화는 <dialog onCancel>로 위임
  const handleBackdropClick = useModalDialog(dialogRef, true, onCancel);

  return (
    <dialog ref={dialogRef} className="confirm-modal" aria-labelledby={msgId} onClick={handleBackdropClick} onCancel={onCancel}>
      <div className="confirm-modal__container">
        <p className="confirm-modal__msg" id={msgId}>{message}</p>
        {details && details.length > 0 && (
          <ul className="confirm-modal__list">
            {details.map(line => <li key={line}>{line}</li>)}
          </ul>
        )}
        <div className="confirm-modal__actions">
          {extraAction && (
            <button className="btn btn--outline-gray btn--sm" type="button" onClick={extraAction.onClick}>
              {extraAction.label}
            </button>
          )}
          <button className="btn btn--outline-gray btn--sm" type="button" onClick={onCancel}>
            취소
          </button>
          <button
            className={confirmTone === 'danger' ? 'btn btn--sm confirm-modal__delete-btn' : 'btn btn--sm btn--main'}
            type="button"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
