interface Props {
  saveFailed: boolean;
  hasCorrupt: boolean;
  onExport: () => void;
  onRetry: () => void;
  onDownloadCorrupt: () => void;
  onDiscardCorrupt: () => void;
}

// 브라우저에 저장하지 못했거나, 읽을 수 없는 저장 데이터가 있을 때 화면 위에 보여 주는 안내.
export default function StorageNotice({ saveFailed, hasCorrupt, onExport, onRetry, onDownloadCorrupt, onDiscardCorrupt }: Props) {
  if (!saveFailed && !hasCorrupt) return null;
  return (
    <>
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
            읽을 수 없는 저장 데이터가 있어 해당 부분은 비어 있는 상태로 시작했습니다. 원래 내용은 따로 보관해 두었으니 필요하면 내려받으세요.
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
