import { useState } from 'react';
import { PRIORITY_LABEL, FREQUENCY_LABEL, KIND_LABEL } from '../constants/labels';
import type { Todo, TodoUpdates, RecurrenceFrequency } from '../types/todo';
import type { Memo } from '../hooks/useMemos';
import ConfirmModal from './ConfirmModal';
import TodoItemEditForm from './TodoItemEditForm';
import TodoItemMenu from './TodoItemMenu';
import TodoItemSubtasks from './TodoItemSubtasks';
import { ChevronIcon, DeleteIcon, DragHandleIcon, EditIcon, PinIcon } from './icons';
import { isOverdue, formatDate } from '../utils/date';
import { normalizeKind } from '../utils/kind';

interface Props {
  todo: Todo;
  manualSort?: boolean;
  selectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelect?: (id: string) => void;
  onToggleSubtasksCollapsed: (id: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  onCopy: (todo: Todo) => void;
  onShare: (todo: Todo) => void;
  onKakaoShare: (todo: Todo) => void;
  onDuplicate: (id: string) => void;
  onUpdate: (id: string, updates: TodoUpdates) => void;
  onAddSubtask: (id: string, text: string) => void;
  onToggleSubtask: (todoId: string, subId: string) => void;
  onDeleteSubtask: (todoId: string, subId: string) => void;
  onUpdateSubtask: (todoId: string, subId: string, text: string) => void;
  onReorderSubtasks: (todoId: string, fromIndex: number, toIndex: number) => void;
  categories: string[];
  memos: Memo[];
  onOpenMemo: (memoId: string) => void;
}

export default function TodoItem({ todo, manualSort, selectionMode, isSelected, onToggleSelect, onToggle, onDelete, onPin, onCopy, onShare, onKakaoShare, onDuplicate, onUpdate, onAddSubtask, onToggleSubtask, onDeleteSubtask, onUpdateSubtask, onReorderSubtasks, onToggleSubtasksCollapsed, categories, memos, onOpenMemo }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const kind = normalizeKind(todo.kind);
  const overdue = !todo.completed && isOverdue(todo.dueDate);
  const done = (todo.subtasks ?? []).filter(s => s.completed).length;
  const total = (todo.subtasks ?? []).length;
  const linkedMemos = (todo.memoIds ?? [])
    .map(id => memos.find(m => m.id === id))
    .filter((m): m is Memo => m !== undefined);

  if (isEditing) {
    return (
      <TodoItemEditForm
        todo={todo}
        categories={categories}
        memos={memos}
        onSave={updates => { onUpdate(todo.id, updates); setIsEditing(false); }}
        onCancel={() => setIsEditing(false)}
      />
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
          <DragHandleIcon />
        </span>
      )}
      <div className="todo-item__body">

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
          <div className="todo-item__actions">
            <button
              type="button"
              className={`todo-item__btn todo-item__btn--pin${todo.pinned ? ' todo-item__btn--pin-active' : ''}`}
              onClick={() => onPin(todo.id)}
              aria-label={todo.pinned ? '고정 해제' : '상단 고정'}
            >
              <PinIcon filled={!!todo.pinned} />
            </button>
            <button
              className="todo-item__btn todo-item__btn--edit"
              type="button"
              onClick={() => setIsEditing(true)}
              aria-label="수정"
            >
              <EditIcon />
            </button>
            <button
              className="todo-item__btn todo-item__btn--delete"
              type="button"
              onClick={() => setShowConfirm(true)}
              aria-label="삭제"
            >
              <DeleteIcon />
            </button>
            <TodoItemMenu
              todo={todo}
              onCopy={onCopy}
              onShare={onShare}
              onKakaoShare={onKakaoShare}
              onDuplicate={onDuplicate}
            />
          </div>
        </div>
        <div className="todo-item__meta">
          <span className={`todo-item__badge todo-item__badge--${todo.priority}`}>
            {PRIORITY_LABEL[todo.priority]}
          </span>
          {todo.category && (
            <span className="todo-item__category">{todo.category}</span>
          )}
          {(todo.seriesId || (todo.recurrence && todo.recurrence !== 'none')) && (
            <span className="todo-item__badge todo-item__badge--recurrence">
              🔁 {todo.seriesId ? '반복' : FREQUENCY_LABEL[todo.recurrence as RecurrenceFrequency]}
            </span>
          )}
          {kind !== 'task' && (
            <span className={`todo-item__badge todo-item__badge--kind-${kind}`}>{KIND_LABEL[kind]}</span>
          )}
          {linkedMemos.map(m => (
            <button
              key={m.id}
              type="button"
              className="todo-item__memo-link"
              onClick={() => onOpenMemo(m.id)}
            >
              📎 {m.title || '제목 없음'}
            </button>
          ))}
          <button
            type="button"
            className={`todo-item__memo-link todo-item__memo-link--empty${linkedMemos.length > 0 ? ' todo-item__memo-link--add' : ''}`}
            onClick={() => setIsEditing(true)}
            aria-label={linkedMemos.length > 0 ? '메모 추가 연결' : '메모 연결'}
          >
            {linkedMemos.length > 0 ? '+ 메모' : '📎 메모 연결'}
          </button>
          {total > 0 && (
            <div className="todo-item__sub-meta">
              <span className="todo-item__sub-progress">진행도 {done}/{total}</span>
              <button
                type="button"
                className="todo-item__sub-toggle"
                onClick={() => onToggleSubtasksCollapsed(todo.id)}
                aria-expanded={!todo.subtasksCollapsed}
                aria-controls={`todo-subtasks-${todo.id}`}
              >
                <ChevronIcon className={`todo-item__sub-toggle-icon${todo.subtasksCollapsed ? ' todo-item__sub-toggle-icon--collapsed' : ''}`} />
                {todo.subtasksCollapsed ? '더보기' : '접기'}
              </button>
            </div>
          )}
        </div>

        <div className="todo-item__dates">
          <span className="todo-item__dates-text">등록일: {formatDate(todo.createdAt)}</span>
          {todo.dueDate && (
            <>
              <span className="todo-item__dates-sep" aria-hidden="true">/</span>
              <span className={`todo-item__dates-text${overdue ? ' todo-item__dates-text--overdue' : ''}`}>
                {todo.startDate ? '기간: ' : '마감일: '}{overdue ? '⚠ ' : ''}{todo.startDate ? `${formatDate(todo.startDate)} ~ ${formatDate(todo.dueDate)}` : formatDate(todo.dueDate)}
              </span>
            </>
          )}
        </div>

        <TodoItemSubtasks
          todo={todo}
          onAddSubtask={onAddSubtask}
          onToggleSubtask={onToggleSubtask}
          onDeleteSubtask={onDeleteSubtask}
          onUpdateSubtask={onUpdateSubtask}
          onReorderSubtasks={onReorderSubtasks}
        />
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
