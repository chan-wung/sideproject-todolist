import { useEffect, useRef, useState } from 'react';
import ConfirmModal from './ConfirmModal';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onResetTodos: () => void;
  onResetMemos: () => void;
  onResetAll: () => void;
}

type PendingAction = 'todos' | 'memos' | 'all' | null;

const CONFIRM_MESSAGES: Record<Exclude<PendingAction, null>, string> = {
  todos: '모든 할일이 삭제됩니다. 계속할까요?',
  memos: '모든 메모가 삭제됩니다. 계속할까요?',
  all: '할일과 메모 전체가 삭제됩니다. 계속할까요?',
};

export default function SettingsModal({ isOpen, onClose, onResetTodos, onResetMemos, onResetAll }: Props) {
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (isOpen) {
      dialogRef.current?.showModal();
      document.body.style.overflow = 'hidden';
    } else {
      dialogRef.current?.close();
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  function handleConfirm() {
    if (pendingAction === 'todos') onResetTodos();
    else if (pendingAction === 'memos') onResetMemos();
    else if (pendingAction === 'all') onResetAll();
    setPendingAction(null);
    onClose();
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) onClose();
  }

  if (!isOpen) return null;

  return (
    <dialog ref={dialogRef} className="settings-modal" onCancel={onClose} onClick={handleBackdropClick}>
      <div className="settings-modal__container">
        <div className="settings-modal__header">
          <h2 className="settings-modal__tit">설정</h2>
          <button type="button" className="settings-modal__close" onClick={onClose} aria-label="닫기">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        <div className="settings-modal__body">
          <section className="settings-modal__section">
            <h3 className="settings-modal__section-tit">데이터 초기화</h3>
            <p className="settings-modal__desc">초기화 후 복구할 수 없습니다. 필요하다면 먼저 내보내기(백업)를 진행하세요.</p>
            <ul className="settings-modal__list">
              <li className="settings-modal__item">
                <div className="settings-modal__item-info">
                  <strong className="settings-modal__item-tit">할일 초기화</strong>
                  <span className="settings-modal__item-desc">모든 할일 항목을 삭제합니다.</span>
                </div>
                <button type="button" className="settings-modal__reset-btn settings-modal__reset-btn--danger" onClick={() => setPendingAction('todos')}>
                  초기화
                </button>
              </li>
              <li className="settings-modal__item">
                <div className="settings-modal__item-info">
                  <strong className="settings-modal__item-tit">메모 초기화</strong>
                  <span className="settings-modal__item-desc">모든 메모를 삭제합니다.</span>
                </div>
                <button type="button" className="settings-modal__reset-btn settings-modal__reset-btn--danger" onClick={() => setPendingAction('memos')}>
                  초기화
                </button>
              </li>
              <li className="settings-modal__item settings-modal__item--all">
                <div className="settings-modal__item-info">
                  <strong className="settings-modal__item-tit">전체 초기화</strong>
                  <span className="settings-modal__item-desc">할일과 메모를 모두 삭제합니다.</span>
                </div>
                <button type="button" className="settings-modal__reset-btn settings-modal__reset-btn--all" onClick={() => setPendingAction('all')}>
                  전체 초기화
                </button>
              </li>
            </ul>
          </section>
        </div>
      </div>

      {pendingAction && (
        <ConfirmModal
          message={CONFIRM_MESSAGES[pendingAction]}
          onConfirm={handleConfirm}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </dialog>
  );
}
