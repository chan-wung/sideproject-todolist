interface Props {
  message: string;
  onExport: () => void;
  onSnooze: () => void;
}

// 백업을 오래 안 했을 때 화면 위에 보여 주는 알림. 지금 내보내거나 내일 다시 알림을 고른다.
export default function BackupReminder({ message, onExport, onSnooze }: Props) {
  return (
    <aside className="backup-reminder" role="status">
      <p className="backup-reminder__txt">{message}</p>
      <div className="backup-reminder__actions">
        <button type="button" className="backup-reminder__btn backup-reminder__btn--main" onClick={onExport}>
          지금 내보내기
        </button>
        <button type="button" className="backup-reminder__btn" onClick={onSnooze}>
          내일 다시 알림
        </button>
      </div>
    </aside>
  );
}
