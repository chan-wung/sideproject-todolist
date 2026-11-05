import { useState } from 'react';
import type { Todo, TodoKind } from '../types/todo';
import { PRIORITY_LABEL, PRIORITY_OPTIONS, FREQUENCY_LABEL, FREQUENCY_OPTIONS, KIND_LABEL, KIND_OPTIONS } from '../constants/labels';
import { kindAllowsRecurrence, kindRequiresDate, dueDateLabel } from '../utils/kind';
import Toast from './Toast';
import DatePicker from './DatePicker';

interface Props {
  onAdd: (text: string, priority: Todo['priority'], dueDate: string, category: string, recurrence?: Todo['recurrence'], kind?: TodoKind) => void;
  categories: string[];
}

export default function TodoInput({ onAdd, categories }: Props) {
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<Todo['priority']>('medium');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState('');
  const [recurrence, setRecurrence] = useState<Todo['recurrence']>('none');
  const [kind, setKind] = useState<TodoKind>('task');
  const [toast, setToast] = useState('');
  const [toastKey, setToastKey] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) {
      setToast('할 일 내용을 입력해 주세요.');
      setToastKey(k => k + 1);
      setText('');
      return;
    }
    if (kindRequiresDate(kind) && !dueDate) {
      setToast('연차·휴가는 날짜를 선택해 주세요.');
      setToastKey(k => k + 1);
      return;
    }
    onAdd(text, priority, dueDate, category, kindAllowsRecurrence(kind) ? recurrence : 'none', kind);
    setText('');
    setDueDate('');
    setCategory('');
    setPriority('medium');
    setRecurrence('none');
    setKind('task');
  }

  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <form className="todo-input" onSubmit={handleSubmit}>
      {toast && <Toast key={toastKey} message={toast} onClose={() => setToast('')} />}

      <button
        type="button"
        className={`todo-input__toggle-btn ${isExpanded ? 'todo-input__toggle-btn--expanded' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? '상세 옵션 접기' : '상세 옵션 열기'}
      </button>

      <div className={`todo-input__options ${isExpanded ? 'todo-input__options--expanded' : ''}`}>
        <div className="todo-input__row todo-input__row--flex">
          <div>
            <label className="todo-input__label" htmlFor="todo-input-kind">종류</label>
            <select
              id="todo-input-kind"
              className="todo-input__select"
              value={kind}
              onChange={e => setKind(e.target.value as TodoKind)}
            >
              {KIND_OPTIONS.map(k => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}
            </select>
          </div>

          <div>
            <label className="todo-input__label" htmlFor="todo-input-priority">우선순위</label>
            <select
              id="todo-input-priority"
              className={`todo-input__select todo-input__select--${priority}`}
              value={priority}
              onChange={e => setPriority(e.target.value as Todo['priority'])}
            >
              {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}
            </select>
          </div>

          <div>
            <label className="todo-input__label" id="todo-input-dueDate-label">{dueDateLabel(kind)}</label>
            <DatePicker value={dueDate} onChange={setDueDate} aria-labelledby="todo-input-dueDate-label" />
          </div>

          <div>
            <label className="todo-input__label" htmlFor="todo-input-category">카테고리</label>
            <input
              id="todo-input-category"
              className="todo-input__field"
              type="text"
              placeholder="예: 업무, 개인..."
              value={category}
              onChange={e => setCategory(e.target.value)}
              list="category-options-input"
              autoComplete="off"
            />
            <datalist id="category-options-input">
              {categories.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>

          <div>
            <label className="todo-input__label" htmlFor="todo-input-recurrence">반복 주기</label>
            <select
              id="todo-input-recurrence"
              className="todo-input__select"
              value={kindAllowsRecurrence(kind) ? recurrence : 'none'}
              onChange={e => setRecurrence(e.target.value as Todo['recurrence'])}
              disabled={!kindAllowsRecurrence(kind)}
            >
              <option value="none">반복 안 함</option>
              {FREQUENCY_OPTIONS.map(f => <option key={f} value={f}>{FREQUENCY_LABEL[f]}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="todo-input__main-row">
        <textarea
          className="todo-input__field todo-input__field--textarea"
          placeholder="크게 할 일을 입력하세요... (줄바꿈: Shift+Enter)"
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          rows={2}
        />
      </div>

      <div className="todo-input__footer-row">
        <p className="todo-input__hint">📎 메모 연결은 할 일을 저장한 후 카드에서 할 수 있어요.</p>
        <button className="todo-input__btn" type="submit">추가</button>
      </div>
    </form>
  );
}
