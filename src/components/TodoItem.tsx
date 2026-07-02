import { useState, useRef, useEffect } from 'react';
import type { Todo } from '../types/todo';
import type { Memo } from '../hooks/useMemos';
import ConfirmModal from './ConfirmModal';
import DatePicker from './DatePicker';
import { isOverdue, formatDate } from '../utils/date';

interface Props {
  todo: Todo;
  manualSort?: boolean;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  // New prop for collapsing subtasks
  onToggleSubtasksCollapsed: (id: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Pick<Todo, 'text' | 'priority' | 'dueDate' | 'category' | 'recurrence' | 'memoId'>>) => void;
  onAddSubtask: (id: string, text: string) => void;
  onToggleSubtask: (todoId: string, subId: string) => void;
  onDeleteSubtask: (todoId: string, subId: string) => void;
  onUpdateSubtask: (todoId: string, subId: string, text: string) => void;
  onReorderSubtasks: (todoId: string, fromIndex: number, toIndex: number) => void;
  categories: string[];
  memos: Memo[];
  onOpenMemo: (memoId: string) => void;
}

const PRIORITY_LABEL: Record<Todo['priority'], string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
};

const RECURRENCE_LABEL: Record<string, string> = {
  none: '',
  daily: '매일',
  weekly: '매주',
  monthly: '매월'
};

export default function TodoItem({ todo, manualSort, selectionMode, isSelected, onToggleSelect, onToggle, onDelete, onPin, onUpdate, onAddSubtask, onToggleSubtask, onDeleteSubtask, onUpdateSubtask, onReorderSubtasks, onToggleSubtasksCollapsed, categories, memos, onOpenMemo }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const [editPriority, setEditPriority] = useState<Todo['priority']>(todo.priority);
  const [editDueDate, setEditDueDate] = useState(todo.dueDate ?? '');
  const [editCategory, setEditCategory] = useState(todo.category);
  const [editRecurrence, setEditRecurrence] = useState<Todo['recurrence']>(todo.recurrence || 'none');
  const [editMemoId, setEditMemoId] = useState(todo.memoId ?? '');
  const [subText, setSubText] = useState('');
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editSubText, setEditSubText] = useState('');
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragFromRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  function handleEditStart() {
    setEditText(todo.text);
    setEditPriority(todo.priority);
    setEditDueDate(todo.dueDate ?? '');
    setEditCategory(todo.category);
    setEditRecurrence(todo.recurrence || 'none');
    setEditMemoId(todo.memoId ?? '');
    setIsEditing(true);
  }

  function handleSave() {
    if (!editText.trim()) return;
    onUpdate(todo.id, {
      text: editText.trim(),
      priority: editPriority,
      dueDate: editDueDate || undefined,
      category: editCategory.trim() || '기본',
      recurrence: editRecurrence !== 'none' ? editRecurrence : undefined,
      memoId: editMemoId || undefined,
    });
    setIsEditing(false);
  }

  function handleCancel() {
    setIsEditing(false);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') handleCancel();
  }

  function handleAddSubtask() {
    if (!subText.trim()) return;
    onAddSubtask(todo.id, subText);
    setSubText('');
  }

  function handleSubtaskKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleAddSubtask();
  }

  function handleSaveSubEdit(subId: string) {
    if (!editSubText.trim()) return;
    onUpdateSubtask(todo.id, subId, editSubText);
    setEditingSubId(null);
  }

  const overdue = !todo.completed && isOverdue(todo.dueDate);
  const done = (todo.subtasks ?? []).filter(s => s.completed).length;
  const total = (todo.subtasks ?? []).length;
  const linkedMemo = todo.memoId ? memos.find(m => m.id === todo.memoId) : undefined;

  if (isEditing) {
    return (
      <div id={`todo-item-${todo.id}`} className={`todo-item todo-item--${todo.priority} todo-item--editing`}>
        <div className="todo-item__edit-wrap">
          <div className="todo-item__edit-main">
            <textarea
              ref={inputRef}
              className="todo-item__edit-field todo-input__field--textarea"
              value={editText}
              onChange={e => setEditText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
            />
          </div>
          <div className="todo-item__edit-row">
            <div className="todo-item__edit-group">
              <label className="todo-item__edit-label">우선순위</label>
              <select
                className={`todo-item__edit-select todo-item__edit-select--${editPriority}`}
                value={editPriority}
                onChange={e => setEditPriority(e.target.value as Todo['priority'])}
              >
                <option value="high">높음</option>
                <option value="medium">보통</option>
                <option value="low">낮음</option>
              </select>
            </div>
            <div className="todo-item__edit-group">
              <label className="todo-item__edit-label">마감일</label>
              <DatePicker value={editDueDate} onChange={setEditDueDate} className="todo-item__edit-date-picker" />
            </div>
            <div className="todo-item__edit-group">
              <label className="todo-item__edit-label">카테고리</label>
              <input
                className="todo-item__edit-field todo-item__edit-field--sm"
                type="text"
                value={editCategory}
                onChange={e => setEditCategory(e.target.value)}
                onKeyDown={handleKeyDown}
                list={`category-options-${todo.id}`}
              />
              <datalist id={`category-options-${todo.id}`}>
                {categories.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="todo-item__edit-group">
              <label className="todo-item__edit-label">반복 주기</label>
              <select
                className="todo-item__edit-select"
                value={editRecurrence}
                onChange={e => setEditRecurrence(e.target.value as Todo['recurrence'])}
              >
                <option value="none">없음</option>
                <option value="daily">매일</option>
                <option value="weekly">매주</option>
                <option value="monthly">매월</option>
              </select>
            </div>
            <div className="todo-item__edit-group">
              <label className="todo-item__edit-label">연결 메모</label>
              <select
                className="todo-item__edit-select"
                value={editMemoId}
                onChange={e => setEditMemoId(e.target.value)}
              >
                <option value="">연결 안 함</option>
                {memos.map(m => (
                  <option key={m.id} value={m.id}>{m.title || '제목 없음'}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="todo-item__edit-actions">
            <button className="btn btn--main btn--sm" type="button" onClick={handleSave}>저장</button>
            <button className="btn btn--outline-gray btn--sm" type="button" onClick={handleCancel}>취소</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      id={`todo-item-${todo.id}`}
      className={[
        'todo-item',
        `todo-item--${todo.priority}`,
        todo.completed ? 'todo-item--completed' : '',
        overdue ? 'todo-item--overdue' : '',
        todo.pinned ? 'todo-item--pinned' : '',
      ].filter(Boolean).join(' ')}
    >
      {selectionMode && (
        <label className="todo-item__select form-chk form-chk--checkbox">
          <input
            type="checkbox"
            checked={!!isSelected}
            onChange={() => onToggleSelect?.(todo.id)}
          />
          <span className="form-chk__text">
            <span className="screen-out">선택</span>
          </span>
        </label>
      )}
      {manualSort && (
        <span className="todo-item__drag-handle" aria-hidden="true">
          <svg viewBox="0 0 10 16" fill="currentColor" width="10" height="16">
            <circle cx="3" cy="4" r="1.5"/><circle cx="7" cy="4" r="1.5"/>
            <circle cx="3" cy="8" r="1.5"/><circle cx="7" cy="8" r="1.5"/>
            <circle cx="3" cy="12" r="1.5"/><circle cx="7" cy="12" r="1.5"/>
          </svg>
        </span>
      )}
      <div className="todo-item__body">
        <div className="todo-item__actions">
          <button
            type="button"
            className={`todo-item__btn todo-item__btn--pin${todo.pinned ? ' todo-item__btn--pin-active' : ''}`}
            onClick={() => onPin(todo.id)}
            aria-label={todo.pinned ? '고정 해제' : '상단 고정'}
          >
            <svg viewBox="0 0 24 24" fill={todo.pinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </button>
          <button
            className="todo-item__btn todo-item__btn--edit"
            type="button"
            onClick={handleEditStart}
            aria-label="수정"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </button>
          <button
            className="todo-item__btn todo-item__btn--delete"
            type="button"
            onClick={() => setShowConfirm(true)}
            aria-label="삭제"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </button>
        </div>
        <div className="todo-item__title-wrap">
          <label className="todo-item__check form-chk form-chk--checkbox">
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => onToggle(todo.id)}
            />
            <span className="form-chk__text">
              <span className="screen-out">완료 여부</span>
            </span>
          </label>
          <p className="todo-item__txt">{todo.text}</p>
        </div>
        <div className="todo-item__meta">
          <span className={`todo-item__badge todo-item__badge--${todo.priority}`}>
            {PRIORITY_LABEL[todo.priority]}
          </span>
          {todo.category && (
            <span className="todo-item__category">{todo.category}</span>
          )}
          {todo.recurrence && todo.recurrence !== 'none' && (
            <span className="todo-item__badge todo-item__badge--recurrence">
              🔁 {RECURRENCE_LABEL[todo.recurrence]}
            </span>
          )}
          {linkedMemo && (
            <button
              type="button"
              className="todo-item__memo-link"
              onClick={() => onOpenMemo(linkedMemo.id)}
            >
              📎 {linkedMemo.title || '제목 없음'}
            </button>
          )}
          <div className="todo-item__sub-meta">
            {total > 0 && (
              <span className="todo-item__sub-progress">진행도 {done}/{total}</span>
            )}
            <button
              type="button"
              className="todo-item__sub-toggle"
              onClick={() => onToggleSubtasksCollapsed(todo.id)}
              aria-expanded={!todo.subtasksCollapsed}
              aria-controls={`todo-subtasks-${todo.id}`}
            >
              <svg
                className={`todo-item__sub-toggle-icon${todo.subtasksCollapsed ? ' todo-item__sub-toggle-icon--collapsed' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
              {todo.subtasksCollapsed ? '더보기' : '접기'}
            </button>
          </div>
        </div>

        <div className="todo-item__dates">
          <span className="todo-item__dates-text">등록일: {formatDate(todo.createdAt)}</span>
          {todo.dueDate && (
            <>
              <span className="todo-item__dates-sep" aria-hidden="true">/</span>
              <span className={`todo-item__dates-text${overdue ? ' todo-item__dates-text--overdue' : ''}`}>
                마감일: {overdue ? '⚠ ' : ''}{formatDate(todo.dueDate)}
              </span>
            </>
          )}
        </div>

        <div className={`todo-item__subtasks${todo.subtasksCollapsed ? ' todo-item__subtasks--collapsed' : ''}`} id={`todo-subtasks-${todo.id}`}>
          {(todo.subtasks ?? []).map((sub, index) => (
            <div
              key={sub.id}
              className={['todo-item__subtask', dragOverIndex === index ? 'todo-item__subtask--drag-over' : ''].filter(Boolean).join(' ')}
              draggable={editingSubId !== sub.id}
              onDragStart={() => { dragFromRef.current = index; }}
              onDragOver={(e) => { e.preventDefault(); if (dragOverIndex !== index) setDragOverIndex(index); }}
              onDragLeave={() => setDragOverIndex(null)}
              onDrop={() => {
                if (dragFromRef.current !== null && dragFromRef.current !== index) {
                  onReorderSubtasks(todo.id, dragFromRef.current, index);
                }
                setDragOverIndex(null);
                dragFromRef.current = null;
              }}
              onDragEnd={() => { setDragOverIndex(null); dragFromRef.current = null; }}
            >
              {editingSubId === sub.id ? (
                <div className="todo-item__sub-edit">
                  <input
                    className="todo-item__edit-field todo-item__edit-field--sm"
                    type="text"
                    value={editSubText}
                    onChange={e => setEditSubText(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleSaveSubEdit(sub.id);
                      if (e.key === 'Escape') setEditingSubId(null);
                    }}
                    autoFocus
                  />
                  <button type="button" className="todo-item__btn-sub-action todo-item__btn-sub-action--save" onClick={() => handleSaveSubEdit(sub.id)} aria-label="저장">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    <span className="screen-out">저장</span>
                  </button>
                  <button type="button" className="todo-item__btn-sub-action todo-item__btn-sub-action--cancel" onClick={() => setEditingSubId(null)} aria-label="취소">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                    <span className="screen-out">취소</span>
                  </button>
                </div>
              ) : (
                <>
                  <span className="todo-item__sub-drag" aria-hidden="true">
                    <svg viewBox="0 0 10 16" fill="currentColor" width="10" height="16">
                      <circle cx="3" cy="4" r="1.5"/><circle cx="7" cy="4" r="1.5"/>
                      <circle cx="3" cy="8" r="1.5"/><circle cx="7" cy="8" r="1.5"/>
                      <circle cx="3" cy="12" r="1.5"/><circle cx="7" cy="12" r="1.5"/>
                    </svg>
                  </span>
                  <label className="form-chk form-chk--checkbox">
                    <input
                      type="checkbox"
                      checked={sub.completed}
                      onChange={() => onToggleSubtask(todo.id, sub.id)}
                    />
                    <span className="form-chk__text">{sub.text}</span>
                  </label>
                  <button
                    type="button"
                    className="todo-item__btn-sub-edit"
                    onClick={() => { setEditingSubId(sub.id); setEditSubText(sub.text); }}
                    aria-label="하위 항목 수정"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    <span className="screen-out">수정</span>
                  </button>
                  <button
                    type="button"
                    className="todo-item__btn-sub-del"
                    onClick={() => onDeleteSubtask(todo.id, sub.id)}
                    aria-label="서브태스크 삭제"
                  >
                    <span className="screen-out">삭제</span>
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
        <div className="todo-item__sub-add">
          <input
            className="todo-input__field"
            type="text"
            placeholder="하위 항목 추가"
            value={subText}
            onChange={e => setSubText(e.target.value)}
            onKeyDown={handleSubtaskKeyDown}
          />
          <button className="todo-item__sub-add-btn" type="button" onClick={handleAddSubtask} aria-label="하위 항목 추가">
            <span className="screen-out">추가</span>
          </button>
        </div>
      </div>

      {showConfirm && (
        <ConfirmModal
          message={`"${todo.text.length > 20 ? todo.text.slice(0, 20) + '…' : todo.text}" 을(를) 삭제할까요?`}
          onConfirm={() => { setShowConfirm(false); onDelete(todo.id); }}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}
