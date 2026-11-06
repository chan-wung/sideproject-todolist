interface Props {
  onApply: () => void;
  onLater: () => void;
}

// 새 버전이 준비됐을 때 화면 위에 보여 주는 안내. 백업 알림과 같은 모양을 쓴다.
export default function UpdateNotice({ onApply, onLater }: Props) {
  return (
    <aside className="backup-reminder" role="status">
      <p className="backup-reminder__txt">
        새 버전이 준비되었습니다. 새로고침하면 아직 등록하지 않은 입력은 사라지니, 쓰던 내용은 먼저 등록하거나 저장한 뒤 적용하세요.
      </p>
      <div className="backup-reminder__actions">
        <button type="button" className="backup-reminder__btn backup-reminder__btn--main" onClick={onApply}>
          지금 새로고침
        </button>
        <button type="button" className="backup-reminder__btn" onClick={onLater}>
          나중에
        </button>
      </div>
    </aside>
  );
}
