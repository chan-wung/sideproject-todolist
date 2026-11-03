import { useEffect, useRef, useState } from 'react';
import { useModalDialog } from '../hooks/useModalDialog';
import { PRIORITY_LABEL, PRIORITY_OPTIONS, FREQUENCY_LABEL, FREQUENCY_OPTIONS } from '../constants/labels';
import type { Todo, RecurrenceSeries, RecurrenceFrequency } from '../types/todo';
import { formatDate, todayStr, upcomingOccurrences } from '../utils/date';
import ConfirmModal from './ConfirmModal';
import DatePicker from './DatePicker';

interface SeriesInput {
  text: string;
  category: string;
  priority: Todo['priority'];
  frequency: RecurrenceFrequency;
  anchorDate: string;
  endDate?: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  seriesList: RecurrenceSeries[];
  todos: Todo[];
  categories: string[];
  onAdd: (input: SeriesInput) => void;
  onUpdate: (id: string, updates: Partial<Pick<RecurrenceSeries, 'text' | 'category' | 'priority' | 'frequency' | 'anchorDate' | 'endDate'>>) => void;
  onEnd: (id: string) => void;
  onResume: (id: string) => void;
  onDelete: (id: string) => void;
}

const CAT_DATALIST_ID = 'recurrence-cat-options';

const EMPTY_ADD: SeriesInput = {
  text: '',
  category: '',
  priority: 'medium',
  frequency: 'monthly',
  anchorDate: '',
};

// 반복 시리즈 추가 폼과 인라인 편집 폼이 공유하는 입력 필드 묶음 (주기/기준일/우선순위/카테고리, 선택적으로 종료일).
function SeriesFields({ value, onChange, showEndDate }: {
  value: SeriesInput;
  onChange: (patch: Partial<SeriesInput>) => void;
  showEndDate?: boolean;
}) {
  return (
    <>
      <label className="recurrence-modal__field">
        <span className="recurrence-modal__field-label">주기</span>
        <select
          className="recurrence-modal__select"
          value={value.frequency}
          onChange={e => onChange({ frequency: e.target.value as RecurrenceFrequency })}
        >
          {FREQUENCY_OPTIONS.map(f => <option key={f} value={f}>{FREQUENCY_LABEL[f]}</option>)}
        </select>
      </label>
      <label className="recurrence-modal__field">
        <span className="recurrence-modal__field-label">기준일</span>
        <DatePicker value={value.anchorDate} onChange={v => onChange({ anchorDate: v })} />
      </label>
      <label className="recurrence-modal__field">
        <span className="recurrence-modal__field-label">우선순위</span>
        <select
          className="recurrence-modal__select"
          value={value.priority}
          onChange={e => onChange({ priority: e.target.value as Todo['priority'] })}
        >
          {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
        </select>
      </label>
      <label className="recurrence-modal__field">
        <span className="recurrence-modal__field-label">카테고리</span>
        <input
          type="text"
          className="recurrence-modal__input"
          placeholder="예: 업무"
          value={value.category}
          onChange={e => onChange({ category: e.target.value })}
          list={CAT_DATALIST_ID}
          autoComplete="off"
        />
      </label>
      {showEndDate && (
        <label className="recurrence-modal__field">
          <span className="recurrence-modal__field-label">종료일 (선택)</span>
          <DatePicker value={value.endDate ?? ''} onChange={v => onChange({ endDate: v })} />
        </label>
      )}
    </>
  );
}

export default function RecurrenceSeriesModal({ isOpen, onClose, seriesList, todos, categories, onAdd, onUpdate, onEnd, onResume, onDelete }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [addForm, setAddForm] = useState<SeriesInput>(EMPTY_ADD);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<SeriesInput>(EMPTY_ADD);
  const [confirm, setConfirm] = useState<{ type: 'end' | 'delete'; id: string } | null>(null);

  useModalDialog(dialogRef, isOpen);

  // 닫힐 때 입력 중이던 폼 상태를 초기화한다.
  useEffect(() => {
    if (!isOpen) {
      setEditingId(null);
      setAddForm(EMPTY_ADD);
    }
  }, [isOpen]);

  function handleBackdropClick(e: React.MouseEvent<HTMLDialogElement>) {
    if (e.target === dialogRef.current) onClose();
  }

  if (!isOpen) return null;

  const today = todayStr();

  function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.text.trim() || !addForm.anchorDate) return;
    onAdd(addForm);
    setAddForm(EMPTY_ADD);
  }

  function startEdit(s: RecurrenceSeries) {
    setEditingId(s.id);
    setEditForm({
      text: s.text,
      category: s.category,
      priority: s.priority,
      frequency: s.frequency,
      anchorDate: s.anchorDate,
      endDate: s.endDate ?? '',
    });
  }

  function saveEdit() {
    if (!editingId || !editForm.text.trim() || !editForm.anchorDate) return;
    onUpdate(editingId, {
      text: editForm.text.trim(),
      category: editForm.category.trim() || '기본',
      priority: editForm.priority,
      frequency: editForm.frequency,
      anchorDate: editForm.anchorDate,
      endDate: editForm.endDate || undefined,
    });
    setEditingId(null);
  }

  const activeSeries = seriesList.filter(s => s.status === 'active');
  const endedSeries = seriesList.filter(s => s.status === 'ended');
  const ordered = [...activeSeries, ...endedSeries];

  return (
    <dialog ref={dialogRef} className="recurrence-modal" onCancel={onClose} onClick={handleBackdropClick}>
      <div className="recurrence-modal__container">
        <div className="recurrence-modal__header">
          <h2 className="recurrence-modal__tit">반복 일정</h2>
          <button type="button" className="recurrence-modal__close" onClick={onClose} aria-label="닫기">
            <span aria-hidden="true">&times;</span>
          </button>
        </div>

        <datalist id={CAT_DATALIST_ID}>
          {categories.map(c => <option key={c} value={c} />)}
        </datalist>

        <form className="recurrence-modal__add" onSubmit={handleAddSubmit}>
          <div className="recurrence-modal__add-row">
            <input
              type="text"
              className="recurrence-modal__input recurrence-modal__input--text"
              placeholder="반복할 할 일 내용"
              value={addForm.text}
              onChange={e => setAddForm(f => ({ ...f, text: e.target.value }))}
              aria-label="반복할 할 일 내용"
            />
          </div>
          <div className="recurrence-modal__add-row recurrence-modal__add-row--fields">
            <SeriesFields value={addForm} onChange={patch => setAddForm(f => ({ ...f, ...patch }))} />
          </div>
          <div className="recurrence-modal__add-row recurrence-modal__add-row--submit">
            <button type="submit" className="recurrence-modal__add-btn">반복 일정 추가</button>
          </div>
        </form>

        <div className="recurrence-modal__body">
          {ordered.length === 0 ? (
            <div className="recurrence-modal__empty">
              등록된 반복 일정이 없습니다. 위에서 추가하거나, 할 일을 만들 때 반복 주기를 지정하세요.
            </div>
          ) : (
            <ul className="recurrence-modal__list">
              {ordered.map(s => {
                const instanceCount = todos.filter(t => t.seriesId === s.id).length;
                const upcoming = s.status === 'active'
                  ? upcomingOccurrences(s.anchorDate, s.frequency, today, 3, s.endDate)
                  : [];
                const isEditing = editingId === s.id;

                return (
                  <li key={s.id} className={`recurrence-modal__item${s.status === 'ended' ? ' recurrence-modal__item--ended' : ''}`}>
                    {isEditing ? (
                      <div className="recurrence-modal__edit">
                        <input
                          type="text"
                          className="recurrence-modal__input recurrence-modal__input--text"
                          value={editForm.text}
                          onChange={e => setEditForm(f => ({ ...f, text: e.target.value }))}
                          aria-label="반복 일정 내용"
                        />
                        <div className="recurrence-modal__edit-fields">
                          <SeriesFields value={editForm} onChange={patch => setEditForm(f => ({ ...f, ...patch }))} showEndDate />
                        </div>
                        <div className="recurrence-modal__edit-actions">
                          <button type="button" className="recurrence-modal__btn recurrence-modal__btn--primary" onClick={saveEdit}>저장</button>
                          <button type="button" className="recurrence-modal__btn" onClick={() => setEditingId(null)}>취소</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="recurrence-modal__item-main">
                          <p className="recurrence-modal__item-text">{s.text}</p>
                          <div className="recurrence-modal__item-meta">
                            <span className="recurrence-modal__badge recurrence-modal__badge--freq">🔁 {FREQUENCY_LABEL[s.frequency]}</span>
                            <span className={`recurrence-modal__badge recurrence-modal__badge--${s.priority}`}>{PRIORITY_LABEL[s.priority]}</span>
                            <span className="recurrence-modal__badge recurrence-modal__badge--cat">{s.category}</span>
                            <span className="recurrence-modal__badge">기준일 {formatDate(s.anchorDate)}</span>
                            {s.endDate && <span className="recurrence-modal__badge">종료 {formatDate(s.endDate)}</span>}
                            <span className="recurrence-modal__badge">생성된 회차 {instanceCount}개</span>
                            {s.status === 'ended' && <span className="recurrence-modal__badge recurrence-modal__badge--ended">종료됨</span>}
                          </div>
                          <p className="recurrence-modal__upcoming">
                            {s.status === 'ended'
                              ? '이 반복은 종료되어 더 이상 회차가 생성되지 않습니다.'
                              : upcoming.length > 0
                                ? <>다음 예정: {upcoming.map(formatDate).join(' · ')}</>
                                : '예정된 회차가 없습니다.'}
                          </p>
                        </div>
                        <div className="recurrence-modal__item-actions">
                          <button type="button" className="recurrence-modal__btn" onClick={() => startEdit(s)}>편집</button>
                          {s.status === 'active' ? (
                            <button type="button" className="recurrence-modal__btn" onClick={() => setConfirm({ type: 'end', id: s.id })}>종료</button>
                          ) : (
                            <button type="button" className="recurrence-modal__btn" onClick={() => onResume(s.id)}>재개</button>
                          )}
                          <button type="button" className="recurrence-modal__btn recurrence-modal__btn--danger" onClick={() => setConfirm({ type: 'delete', id: s.id })}>삭제</button>
                        </div>
                      </>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {confirm?.type === 'end' && (
        <ConfirmModal
          message="이 반복 일정을 종료할까요? 이후 회차는 생성되지 않지만, 이미 만들어진 미완료 회차는 목록에 그대로 남습니다."
          onConfirm={() => { onEnd(confirm.id); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm?.type === 'delete' && (
        <ConfirmModal
          message="이 반복 일정 규칙을 삭제할까요? 이미 생성된 회차 할 일은 유지되고 반복 연결만 끊깁니다."
          onConfirm={() => { onDelete(confirm.id); setConfirm(null); }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </dialog>
  );
}
