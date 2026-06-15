import { useState, useRef, useEffect } from 'react';
import type { Todo } from '../types/todo';
import ConfirmModal from './ConfirmModal';
import DatePicker from './DatePicker';
import { isOverdue, formatDate } from '../utils/date';

interface Props {
  todo: Todo;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Pick<Todo, 'text' | 'priority' | 'dueDate' | 'category'>>) => void;
  onAddSubtask: (id: string, text: string) => void;
  onToggleSubtask: (todoId: string, subId: string) => void;
  onDeleteSubtask: (todoId: string, subId: string) => void;
  categories: string[];
}

const PRIORITY_LABEL: Record<Todo['priority'], string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
};

export default function TodoItem({ todo, onToggle, onDelete, onPin, onUpdate, onAddSubtask, onToggleSubtask, onDeleteSubtask, categories }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const [editPriority, setEditPriority] = useState<Todo['priority']>(todo.priority);
  const [editDueDate, setEditDueDate] = useState(todo.dueDate ?? '');
  const [editCategory, setEditCategory] = useState(todo.category);
  const [subText, setSubText] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing) inputRef.current?.focus();
  }, [isEditing]);

  function handleEditStart() {
    setEditText(todo.text);
    setEditPriority(todo.priority);
    setEditDueDate(todo.dueDate ?? '');
    setEditCategory(todo.category);
    setIsEditing(true);
  }

  function handleSave() {
    if (!editText.trim()) return;
    onUpdate(todo.id, {
      text: editText.trim(),
      priority: editPriority,
      dueDate: editDueDate || undefined,
      category: editCategory.trim() || '기본',
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

  const overdue = !todo.completed && isOverdue(todo.dueDate);
  const done = (todo.subtasks ?? []).filter(s => s.completed).length;
  const total = (todo.subtasks ?? []).length;

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

      <div className="todo-item__body">
        <p className="todo-item__txt">{todo.text}</p>
        <div className="todo-item__meta">
          <span className={`todo-item__badge todo-item__badge--${todo.priority}`}>
            {PRIORITY_LABEL[todo.priority]}
          </span>
          {todo.category && (
            <span className="todo-item__category">{todo.category}</span>
          )}
          {todo.dueDate && (
            <span className={`todo-item__date${overdue ? ' todo-item__date--overdue' : ''}`}>
              {overdue ? '⚠ ' : ''}{formatDate(todo.dueDate)}
            </span>
          )}
          {total > 0 && (
             <span className="todo-item__sub-progress">진행도 {done}/{total}</span>
          )}
        </div>
        
        <div className="todo-item__subtasks">
          {(todo.subtasks ?? []).map(sub => (
            <div key={sub.id} className="todo-item__subtask">
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
                className="todo-item__btn-sub-del"
                onClick={() => onDeleteSubtask(todo.id, sub.id)}
                aria-label="서브태스크 삭제"
              >
                <span className="screen-out">삭제</span>
              </button>
            </div>
          ))}
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
      </div>

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
