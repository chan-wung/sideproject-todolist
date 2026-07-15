import { useEffect, useRef, useState } from 'react';
import type { CompletionLogEntry } from '../types/todo';
import { formatDate, formatTime } from '../utils/date';
import ConfirmModal from './ConfirmModal';
import DatePicker from './DatePicker';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entries: CompletionLogEntry[];
  onReset: () => void;
  onCopyEntry: (entry: CompletionLogEntry) => void;
  onShareEntry: (entry: CompletionLogEntry) => void;
  onCopyAll: (entries: CompletionLogEntry[]) => void;
  onShareAll: (entries: CompletionLogEntry[]) => void;
  onKakaoShareAll: (entries: CompletionLogEntry[]) => void;
}

const PRIORITY_LABEL: Record<CompletionLogEntry['priority'], string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
};

function groupByDate(entries: CompletionLogEntry[]): [string, CompletionLogEntry[]][] {
  const groups = new Map<string, CompletionLogEntry[]>();
  for (const entry of entries) {
    const dateKey = entry.completedAt.slice(0, 10);
    const group = groups.get(dateKey);
    if (group) group.push(entry);
    else groups.set(dateKey, [entry]);
  }
  return Array.from(groups.entries());
}

export default function CompletionLogModal({ isOpen, onClose, entries, onReset, onCopyEntry, onShareEntry, onCopyAll, onShareAll, onKakaoShareAll }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDate, setSearchDate] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

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

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) onClose();
  }

  if (!isOpen) return null;

  const categories = Array.from(new Set(entries.map(e => e.category).filter(Boolean))).sort();

  const q = searchQuery.trim().toLowerCase();
  const filteredEntries = entries.filter(e => {
    const textMatch = !q || e.text.toLowerCase().includes(q);
    const categoryMatch = filterCategory === 'all' || e.category === filterCategory;
    const dateMatch = !searchDate || e.completedAt.slice(0, 10) === searchDate;
    return textMatch && categoryMatch && dateMatch;
  });
  const groups = groupByDate(filteredEntries);

  return (
    <dialog ref={dialogRef} className="completion-log-modal" onCancel={onClose} onClick={handleBackdropClick}>
      <div className="completion-log-modal__container">
        <div className="completion-log-modal__header">
          <h2 className="completion-log-modal__tit">완료 이력</h2>
          <button type="button" className="completion-log-modal__close" onClick={onClose} aria-label="닫기">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        {entries.length > 0 && (
          <>
            <div className="completion-log-modal__filter">
              <select
                className="completion-log-modal__category"
                value={filterCategory}
                onChange={e => setFilterCategory(e.target.value)}
                aria-label="카테고리 필터"
              >
                <option value="all">전체 카테고리</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <DatePicker value={searchDate} onChange={setSearchDate} placeholder="날짜 선택" className="completion-log-modal__search-date" />
            </div>
            <div className="completion-log-modal__search">
              <input
                type="search"
                className="completion-log-modal__search-input"
                placeholder="내용 검색"
                aria-label="완료 이력 검색"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </>
        )}

        {filteredEntries.length > 0 && (
          <div className="completion-log-modal__actions">
            <button
              type="button"
              className="completion-log-modal__action-btn"
              onClick={() => onCopyAll(filteredEntries)}
            >
              전체 복사
            </button>
            <button
              type="button"
              className="completion-log-modal__action-btn"
              onClick={() => onShareAll(filteredEntries)}
            >
              공유
            </button>
            <button
              type="button"
              className="completion-log-modal__action-btn"
              onClick={() => onKakaoShareAll(filteredEntries)}
            >
              카카오톡 공유
            </button>
          </div>
        )}

        <div className="completion-log-modal__body">
          {entries.length === 0 ? (
            <div className="completion-log-modal__empty">
              완료 항목을 삭제하면 여기에 기록이 쌓입니다.
            </div>
          ) : groups.length === 0 ? (
            <div className="completion-log-modal__empty">
              검색 조건에 맞는 기록이 없습니다.
            </div>
          ) : (
            groups.map(([dateKey, group]) => (
              <section key={dateKey} className="completion-log-modal__group">
                <h3 className="completion-log-modal__date">{formatDate(dateKey)}</h3>
                <ul className="completion-log-modal__list">
                  {group.map(entry => (
                    <li key={entry.id + entry.completedAt} className="completion-log-modal__item">
                      <div className="completion-log-modal__item-meta">
                        <span className="completion-log-modal__item-time">{formatTime(entry.completedAt)}</span>
                        <span className={`completion-log-modal__item-badge completion-log-modal__item-badge--${entry.priority}`}>
                          {PRIORITY_LABEL[entry.priority]}
                        </span>
                        <span className="completion-log-modal__item-category">{entry.category}</span>
                        <div className="completion-log-modal__item-btns">
                          <button
                            type="button"
                            className="completion-log-modal__item-btn"
                            onClick={() => onCopyEntry(entry)}
                            aria-label="복사"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                              <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            className="completion-log-modal__item-btn"
                            onClick={() => onShareEntry(entry)}
                            aria-label="공유"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <circle cx="18" cy="5" r="3" />
                              <circle cx="6" cy="12" r="3" />
                              <circle cx="18" cy="19" r="3" />
                              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                              <line x1="8.59" y1="10.49" x2="15.42" y2="6.51" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <p className="completion-log-modal__item-text">{entry.text}</p>
                      {entry.subtasks && entry.subtasks.length > 0 && (
                        <ul className="completion-log-modal__item-subtasks">
                          {entry.subtasks.map((s, i) => (
                            <li key={i} className="completion-log-modal__item-subtask">
                              {s.text}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>

        {entries.length > 0 && (
          <div className="completion-log-modal__footer">
            <button type="button" className="completion-log-modal__reset-btn" onClick={() => setShowConfirm(true)}>
              이력 전체 삭제
            </button>
          </div>
        )}
      </div>

      {showConfirm && (
        <ConfirmModal
          message="완료 이력을 전부 삭제할까요? 복구할 수 없습니다."
          onConfirm={() => { setShowConfirm(false); onReset(); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </dialog>
  );
}
