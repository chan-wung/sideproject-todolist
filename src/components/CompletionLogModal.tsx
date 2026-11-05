import { useRef, useState } from 'react';
import { useModalDialog } from '../hooks/useModalDialog';
import { PRIORITY_LABEL } from '../constants/labels';
import type { CompletionLogEntry } from '../types/todo';
import { formatDate, formatTime } from '../utils/date';
import { truncate } from '../utils/text';
import ConfirmModal from './ConfirmModal';
import DateRangePicker from './DateRangePicker';
import { CopyIcon, DeleteIcon, ShareIcon } from './icons';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  entries: CompletionLogEntry[];
  onReset: () => void;
  onDeleteEntry: (entry: CompletionLogEntry) => void;
  onCopyEntry: (entry: CompletionLogEntry) => void;
  onShareEntry: (entry: CompletionLogEntry) => void;
  onCopyAll: (entries: CompletionLogEntry[]) => void;
  onShareAll: (entries: CompletionLogEntry[]) => void;
  onKakaoShareAll: (entries: CompletionLogEntry[]) => void;
}

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

export default function CompletionLogModal({ isOpen, onClose, entries, onReset, onDeleteEntry, onCopyEntry, onShareEntry, onCopyAll, onShareAll, onKakaoShareAll }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CompletionLogEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDateStart, setSearchDateStart] = useState('');
  const [searchDateEnd, setSearchDateEnd] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');

  const handleBackdropClick = useModalDialog(dialogRef, isOpen, onClose);

  if (!isOpen) return null;

  const categories = Array.from(new Set(entries.map(e => e.category).filter(Boolean))).sort();

  const q = searchQuery.trim().toLowerCase();
  const filteredEntries = entries.filter(e => {
    const textMatch = !q || e.text.toLowerCase().includes(q);
    const categoryMatch = filterCategory === 'all' || e.category === filterCategory;
    const dateKey = e.completedAt.slice(0, 10);
    const dateMatch = (!searchDateStart || dateKey >= searchDateStart) && (!searchDateEnd || dateKey <= searchDateEnd);
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
                aria-label="프로젝트 필터"
              >
                <option value="all">전체 프로젝트</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <DateRangePicker
                startValue={searchDateStart}
                endValue={searchDateEnd}
                onChange={(start, end) => { setSearchDateStart(start); setSearchDateEnd(end); }}
                placeholder="기간 선택"
                className="completion-log-modal__search-date"
              />
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
                            <CopyIcon />
                          </button>
                          <button
                            type="button"
                            className="completion-log-modal__item-btn"
                            onClick={() => onShareEntry(entry)}
                            aria-label="공유"
                          >
                            <ShareIcon />
                          </button>
                          <button
                            type="button"
                            className="completion-log-modal__item-btn completion-log-modal__item-btn--delete"
                            onClick={() => setDeleteTarget(entry)}
                            aria-label="이 이력 삭제"
                          >
                            <DeleteIcon />
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

      {deleteTarget && (
        <ConfirmModal
          message={`“${truncate(deleteTarget.text, 30)}” 이력을 삭제할까요? 복구할 수 없고, 주간보고에서도 빠집니다.`}
          onConfirm={() => { onDeleteEntry(deleteTarget); setDeleteTarget(null); }}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
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
