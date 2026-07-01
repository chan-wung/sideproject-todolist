import { useState } from 'react';
import type { Todo } from '../types/todo';
import ConfirmModal from './ConfirmModal';

interface Props {
  selectedCount: number;
  categories: string[];
  onSelectAll: () => void;
  onClearSelection: () => void;
  onApplyCategory: (category: string) => void;
  onApplyPriority: (priority: Todo['priority']) => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function BulkActionBar({
  selectedCount,
  categories,
  onSelectAll,
  onClearSelection,
  onApplyCategory,
  onApplyPriority,
  onDelete,
  onClose,
}: Props) {
  const [categoryInput, setCategoryInput] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  function handleCategorySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!categoryInput.trim() || selectedCount === 0) return;
    onApplyCategory(categoryInput);
    setCategoryInput('');
  }

  return (
    <div className="bulk-bar">
      <span className="bulk-bar__count">{selectedCount}개 선택됨</span>

      <div className="bulk-bar__group">
        <button type="button" className="bulk-bar__link-btn" onClick={onSelectAll}>전체 선택</button>
        <button type="button" className="bulk-bar__link-btn" onClick={onClearSelection}>선택 해제</button>
      </div>

      <form className="bulk-bar__category-form" onSubmit={handleCategorySubmit}>
        <input
          className="bulk-bar__category-input"
          type="text"
          placeholder="카테고리 변경"
          value={categoryInput}
          onChange={e => setCategoryInput(e.target.value)}
          list="bulk-category-options"
          disabled={selectedCount === 0}
        />
        <datalist id="bulk-category-options">
          {categories.map(c => <option key={c} value={c} />)}
        </datalist>
        <button type="submit" className="bulk-bar__apply-btn" disabled={selectedCount === 0 || !categoryInput.trim()}>
          적용
        </button>
      </form>

      <div className="bulk-bar__priority-group">
        <button type="button" className="bulk-bar__priority-btn bulk-bar__priority-btn--high" disabled={selectedCount === 0} onClick={() => onApplyPriority('high')}>높음</button>
        <button type="button" className="bulk-bar__priority-btn bulk-bar__priority-btn--medium" disabled={selectedCount === 0} onClick={() => onApplyPriority('medium')}>보통</button>
        <button type="button" className="bulk-bar__priority-btn bulk-bar__priority-btn--low" disabled={selectedCount === 0} onClick={() => onApplyPriority('low')}>낮음</button>
      </div>

      <button
        type="button"
        className="bulk-bar__delete-btn"
        disabled={selectedCount === 0}
        onClick={() => setShowConfirm(true)}
      >
        삭제
      </button>

      <button type="button" className="bulk-bar__close-btn" onClick={onClose} aria-label="선택 모드 종료">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        <span className="screen-out">닫기</span>
      </button>

      {showConfirm && (
        <ConfirmModal
          message={`선택한 ${selectedCount}개 항목을 삭제할까요?`}
          onConfirm={() => { setShowConfirm(false); onDelete(); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}
