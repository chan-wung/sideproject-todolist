import { useRef, useState } from 'react';
import { useModalDialog } from '../hooks/useModalDialog';
import ConfirmModal from './ConfirmModal';
import { formatDate } from '../utils/date';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onResetTodos: () => void;
  onResetMemos: () => void;
  onResetAll: () => void;
  onResetCompletionLog: () => void;
  notifyEnabled: boolean;
  onToggleNotify: (v: boolean) => void;
  /** 마지막으로 내보낸 날짜 'YYYY-MM-DD' (없으면 null) */
  lastBackup: string | null;
}

type PendingAction = 'todos' | 'memos' | 'all' | 'completionLog' | null;

const CONFIRM_MESSAGES: Record<Exclude<PendingAction, null>, string> = {
  todos: '모든 할일이 삭제됩니다. 계속할까요?',
  memos: '모든 메모가 삭제됩니다. 계속할까요?',
  all: '할일, 메모, 저장한 주간보고가 삭제됩니다. 계속할까요?',
  completionLog: '완료 이력이 모두 삭제됩니다. 계속할까요?',
};

export default function SettingsModal({ isOpen, onClose, onResetTodos, onResetMemos, onResetAll, onResetCompletionLog, notifyEnabled, onToggleNotify, lastBackup }: Props) {
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  const handleBackdropClick = useModalDialog(dialogRef, isOpen, onClose);

  function handleConfirm() {
    if (pendingAction === 'todos') onResetTodos();
    else if (pendingAction === 'memos') onResetMemos();
    else if (pendingAction === 'all') onResetAll();
    else if (pendingAction === 'completionLog') onResetCompletionLog();
    setPendingAction(null);
    onClose();
  }

  if (!isOpen) return null;

  const notifySupported = 'Notification' in window;

  async function handleNotifyToggle(e: React.ChangeEvent<HTMLInputElement>) {
    if (!e.target.checked) { onToggleNotify(false); return; }
    const permission = await Notification.requestPermission();
    onToggleNotify(permission === 'granted');
  }

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
            <h3 className="settings-modal__section-tit">알림</h3>
            <ul className="settings-modal__list">
              <li className="settings-modal__item">
                <div className="settings-modal__item-info">
                  <strong className="settings-modal__item-tit">마감일 브라우저 알림</strong>
                  <span className="settings-modal__item-desc">
                    {notifySupported
                      ? (Notification.permission === 'denied'
                          ? '브라우저 설정에서 알림 권한이 차단되어 있습니다. 주소창의 사이트 설정에서 허용해 주세요.'
                          : '앱을 열 때 하루 1회, 오늘 마감·지연 건수를 알려드립니다.')
                      : '이 브라우저는 알림을 지원하지 않습니다.'}
                  </span>
                </div>
                <label className="form-chk form-chk--checkbox">
                  <input
                    type="checkbox"
                    checked={notifyEnabled}
                    disabled={!notifySupported}
                    onChange={handleNotifyToggle}
                  />
                  <span className="form-chk__text"><span className="screen-out">마감일 알림 사용</span></span>
                </label>
              </li>
            </ul>
          </section>

          <section className="settings-modal__section">
            <h3 className="settings-modal__section-tit">백업</h3>
            <p className="settings-modal__desc">
              {lastBackup
                ? `마지막 백업(내보내기): ${formatDate(lastBackup)}`
                : '아직 백업한 적이 없습니다.'}
              {' '}데이터는 이 브라우저에만 저장되므로, 상단 툴바의 내보내기로 파일을 보관해 두세요. 7일 넘게 백업하지 않으면 화면 위에서 알려 드립니다.
            </p>
          </section>

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
              <li className="settings-modal__item">
                <div className="settings-modal__item-info">
                  <strong className="settings-modal__item-tit">완료 이력 초기화</strong>
                  <span className="settings-modal__item-desc">완료 항목 삭제 시 쌓인 이력을 모두 삭제합니다.</span>
                </div>
                <button type="button" className="settings-modal__reset-btn settings-modal__reset-btn--danger" onClick={() => setPendingAction('completionLog')}>
                  초기화
                </button>
              </li>
              <li className="settings-modal__item settings-modal__item--all">
                <div className="settings-modal__item-info">
                  <strong className="settings-modal__item-tit">전체 초기화</strong>
                  <span className="settings-modal__item-desc">할일, 메모, 저장한 주간보고를 모두 삭제합니다.</span>
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
