interface Props {
  saveFailed: boolean;
  hasCorrupt: boolean;
  /** 다른 탭(창)이 이 탭이 읽은 뒤에 데이터를 바꿔 저장을 멈춘 상태 */
  hasStale?: boolean;
  /** 읽을 수 없는 원문을 보관하지 못해 원본을 지키려고 저장을 멈춘 상태 */
  hasHeld?: boolean;
  onKeepThisTab?: () => void;
  onReload?: () => void;
  onExport: () => void;
  onRetry: () => void;
  onDownloadCorrupt: () => void;
  onDiscardCorrupt: () => void;
}

// 브라우저에 저장하지 못했거나, 읽을 수 없는 저장 데이터가 있을 때 화면 위에 보여 주는 안내.
export default function StorageNotice({ saveFailed, hasCorrupt, hasStale = false, hasHeld = false, onKeepThisTab, onReload, onExport, onRetry, onDownloadCorrupt, onDiscardCorrupt }: Props) {
  if (!saveFailed && !hasCorrupt && !hasStale) return null;
  return (
    <>
      {hasStale && (
        <aside className="storage-notice" role="alert">
          <p className="storage-notice__txt">
            다른 탭(또는 창)에서 데이터가 바뀌었습니다. 덮어쓰지 않도록 이 탭의 저장을 멈춰 두었고, 지금 화면의 내용은 그대로입니다. 어느 쪽 내용을 쓸지 고르세요. 이 탭의 내용으로 계속하면 다른 탭의 변경이 사라지고, 다른 탭의 내용을 불러오면 이 탭에서 저장하지 못한 변경이 사라지니 필요하면 먼저 내보내기로 보관하세요.
          </p>
          <div className="storage-notice__actions">
            <button type="button" className="storage-notice__btn storage-notice__btn--main" onClick={onExport}>
              지금 내보내기
            </button>
            <button type="button" className="storage-notice__btn" onClick={onKeepThisTab}>
              이 탭 내용으로 계속
            </button>
            <button type="button" className="storage-notice__btn" onClick={onReload}>
              다른 탭 내용 불러오기
            </button>
          </div>
        </aside>
      )}
      {saveFailed && (
        <aside className="storage-notice" role="alert">
          <p className="storage-notice__txt">
            브라우저에 저장하지 못했습니다. 지금 화면의 내용은 그대로지만 창을 닫으면 사라질 수 있으니 먼저 내보내기로 파일을 보관하세요.
          </p>
          <div className="storage-notice__actions">
            <button type="button" className="storage-notice__btn storage-notice__btn--main" onClick={onExport}>
              지금 내보내기
            </button>
            <button type="button" className="storage-notice__btn" onClick={onRetry}>
              다시 저장
            </button>
          </div>
        </aside>
      )}
      {hasCorrupt && (
        <aside className="storage-notice" role="status">
          <p className="storage-notice__txt">
            {hasHeld
              ? '읽을 수 없는 저장 데이터가 있어 해당 부분은 비어 있는 상태로 시작했습니다. 원래 내용을 브라우저에 따로 보관하지 못해, 지워지지 않도록 그 부분의 저장을 멈춰 두었습니다. 원문을 먼저 내려받은 뒤 ‘보관본 지우기’를 누르면 저장이 다시 시작됩니다.'
              : '읽을 수 없는 저장 데이터가 있어 해당 부분은 비어 있는 상태로 시작했습니다. 원래 내용은 따로 보관해 두었으니 필요하면 내려받으세요.'}
          </p>
          <div className="storage-notice__actions">
            <button type="button" className="storage-notice__btn storage-notice__btn--main" onClick={onDownloadCorrupt}>
              원문 내려받기
            </button>
            <button type="button" className="storage-notice__btn" onClick={onDiscardCorrupt}>
              보관본 지우기
            </button>
          </div>
        </aside>
      )}
    </>
  );
}
