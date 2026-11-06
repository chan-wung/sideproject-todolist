import { useState, useRef, useEffect } from 'react';
import { PRIORITY_LABEL, PRIORITY_OPTIONS, FREQUENCY_LABEL, FREQUENCY_OPTIONS, KIND_LABEL, KIND_OPTIONS } from '../constants/labels';
import type { Todo, TodoKind, TodoUpdates } from '../types/todo';
import { normalizeKind, kindAllowsRecurrence, kindRequiresDate, dueDateLabel } from '../utils/kind';
import type { Memo } from '../hooks/useMemos';
import CategoryPickerModal from './CategoryPickerModal';
import TodoDateField from './TodoDateField';
import { RepeatIcon } from './icons';
import { isImeComposing } from '../utils/ime';

interface Props {
  todo: Todo;
  categories: string[];
  memos: Memo[];
  onSave: (updates: TodoUpdates) => void;
  onCancel: () => void;
}

// 할 일 카드의 편집 폼. 마운트될 때 todo의 현재 값으로 입력 상태를 초기화한다.
export default function TodoItemEditForm({ todo, categories, memos, onSave, onCancel }: Props) {
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const [editPriority, setEditPriority] = useState<Todo['priority']>(todo.priority);
  const [editStartDate, setEditStartDate] = useState(todo.startDate ?? '');
  const [editDueDate, setEditDueDate] = useState(todo.dueDate ?? '');
  const [editCategory, setEditCategory] = useState(todo.category);
  const [editRecurrence, setEditRecurrence] = useState<Todo['recurrence']>(todo.recurrence || 'none');
  const [editMemoIds, setEditMemoIds] = useState<string[]>(todo.memoIds ?? []);
  const [editKind, setEditKind] = useState<TodoKind>(normalizeKind(todo.kind));
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function toggleEditMemo(id: string) {
    setEditMemoIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  const kindNeedsDate = kindRequiresDate(editKind) && !editDueDate;
  // 연차·휴가는 우선순위·프로젝트·반복이 쓰이지 않아 칸을 숨기고 기본값으로 저장한다
  const isLeave = editKind === 'leave';

  function handleSave() {
    if (!editText.trim() || kindNeedsDate) return;
    // 연차는 하루 기준이라 시작일을 지운다. 새로 반복을 지정하는 경우도 마감일 기준이라 쓰지 않는다.
    const usesStart = editKind !== 'leave' && !(kindAllowsRecurrence(editKind) && editRecurrence && editRecurrence !== 'none');
    onSave({
      text: editText.trim(),
      priority: isLeave ? 'medium' : editPriority,
      startDate: usesStart && editStartDate ? editStartDate : undefined,
      dueDate: editDueDate || undefined,
      category: isLeave ? '기본' : editCategory.trim() || '기본',
      recurrence: kindAllowsRecurrence(editKind) && editRecurrence !== 'none' ? editRecurrence : undefined,
      memoIds: editMemoIds.length > 0 ? editMemoIds : undefined,
      kind: editKind,
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLElement>) {
    if (isImeComposing(e)) return; // 한글 조합 중 Enter/Esc는 조합을 확정·취소하는 키다
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === 'Escape') onCancel();
  }

  return (
    <div id={`todo-item-${todo.id}`} className={`todo-item todo-item--${todo.priority} todo-item--editing`}>
      <div className="todo-item__edit-wrap">
        <div className="todo-item__edit-main">
          <textarea
            ref={inputRef}
            className="todo-item__edit-field todo-item__edit-field--textarea"
            value={editText}
            onChange={e => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
          />
        </div>
        <div className="todo-item__edit-row">
          <div className="todo-item__edit-group">
            <label className="todo-item__edit-label" htmlFor={`todo-edit-kind-${todo.id}`}>종류</label>
            <select
              id={`todo-edit-kind-${todo.id}`}
              className="todo-item__edit-select"
              value={editKind}
              onChange={e => setEditKind(e.target.value as TodoKind)}
            >
              {KIND_OPTIONS.map(k => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
            </select>
          </div>
          {!isLeave && (
            <div className="todo-item__edit-group">
              <label className="todo-item__edit-label" htmlFor={`todo-edit-priority-${todo.id}`}>우선순위</label>
              <select
                id={`todo-edit-priority-${todo.id}`}
                className={`todo-item__edit-select todo-item__edit-select--${editPriority}`}
                value={editPriority}
                onChange={e => setEditPriority(e.target.value as Todo['priority'])}
              >
                {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
              </select>
            </div>
          )}
          <div className="todo-item__edit-group">
            <label className="todo-item__edit-label" id={`todo-edit-dueDate-label-${todo.id}`}>{dueDateLabel(editKind)}</label>
            <TodoDateField
              kind={editKind}
              startDate={editStartDate}
              dueDate={editDueDate}
              onChange={range => { setEditStartDate(range.startDate); setEditDueDate(range.dueDate); }}
              className="todo-item__edit-date-picker"
              aria-labelledby={`todo-edit-dueDate-label-${todo.id}`}
            />
          </div>
          {!isLeave && (<>
          <div className="todo-item__edit-group">
            <label className="todo-item__edit-label" htmlFor={`todo-edit-category-${todo.id}`}>프로젝트</label>
            <input
              id={`todo-edit-category-${todo.id}`}
              className="todo-item__edit-field todo-item__edit-field--sm"
              type="text"
              value={editCategory}
              onChange={e => setEditCategory(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
            />
            {categories.length > 0 && (
              <>
                <div className="todo-item__category-suggest">
                  {categories.map(c => (
                    <button
                      key={c}
                      type="button"
                      className={`todo-item__category-suggest-btn${editCategory === c ? ' todo-item__category-suggest-btn--active' : ''}`}
                      onClick={() => setEditCategory(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="todo-item__category-picker-btn"
                  onClick={() => setCategoryPickerOpen(true)}
                >
                  프로젝트 선택
                </button>
              </>
            )}
          </div>
          <div className="todo-item__edit-group">
            <label className="todo-item__edit-label" htmlFor={`todo-edit-recurrence-${todo.id}`}>반복 주기</label>
            {todo.seriesId ? (
              <p className="todo-item__edit-hint">
                <RepeatIcon className="ico-text" />반복 일정에 속한 회차입니다. 주기 변경·종료는 상단 “반복 일정” 메뉴에서 하세요.
              </p>
            ) : (
              <select
                id={`todo-edit-recurrence-${todo.id}`}
                className="todo-item__edit-select"
                value={editRecurrence}
                onChange={e => setEditRecurrence(e.target.value as Todo['recurrence'])}
              >
                <option value="none">없음</option>
                {FREQUENCY_OPTIONS.map(f => <option key={f} value={f}>{FREQUENCY_LABEL[f]}</option>)}
              </select>
            )}
          </div>
          </>)}
        </div>
        {!isLeave && (
        <div className="todo-item__edit-group todo-item__edit-group--full">
          <label className="todo-item__edit-label">연결 메모</label>
          {memos.length > 0 ? (
            <div className="todo-item__memo-checklist">
              {memos.map(m => (
                <label key={m.id} className="form-chk form-chk--checkbox">
                  <input
                    type="checkbox"
                    checked={editMemoIds.includes(m.id)}
                    onChange={() => toggleEditMemo(m.id)}
                  />
                  <span className="form-chk__text">{m.title || '제목 없음'}</span>
                </label>
              ))}
            </div>
          ) : (
            <p className="todo-item__memo-empty">메모 없음</p>
          )}
        </div>
        )}
        {kindNeedsDate && (
          <p className="todo-item__edit-hint" role="alert">연차·휴가는 날짜를 선택해야 저장할 수 있습니다.</p>
        )}
        <div className="todo-item__edit-actions">
          <button className="btn btn--main btn--sm" type="button" onClick={handleSave} disabled={kindNeedsDate}>수정</button>
          <button className="btn btn--outline-gray btn--sm" type="button" onClick={onCancel}>취소</button>
        </div>
      </div>
      {categoryPickerOpen && (
        <CategoryPickerModal
          categories={categories}
          value={editCategory}
          onApply={setEditCategory}
          onClose={() => setCategoryPickerOpen(false)}
        />
      )}
    </div>
  );
}
