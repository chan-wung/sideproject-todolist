import { useState } from 'react';
import type { Todo } from '../types/todo';
import Toast from './Toast';
import DatePicker from './DatePicker';

interface Props {
  onAdd: (text: string, priority: Todo['priority'], dueDate: string, category: string, recurrence?: Todo['recurrence']) => void;
  categories: string[];
}

export default function TodoInput({ onAdd, categories }: Props) {
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<Todo['priority']>('medium');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState('');
  const [recurrence, setRecurrence] = useState<Todo['recurrence']>('none');
  const [toast, setToast] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) {
      setToast('할 일 내용을 입력해 주세요.');
      setText('');
      return;
    }
    onAdd(text, priority, dueDate, category, recurrence);
    setText('');
    setDueDate('');
    setCategory('');
    setPriority('medium');
    setRecurrence('none');
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
      {toast && <Toast message={toast} onClose={() => setToast('')} />}

      <div className="todo-input__main-row">
        <textarea
          className="todo-input__field todo-input__field--textarea"
          placeholder="크게 할 일을 입력하세요... (줄바꿈: Shift+Enter)"
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          rows={2}
        />
        <button className="todo-input__btn" type="submit">추가</button>
      </div>

      <div className={`todo-input__options ${isExpanded ? 'todo-input__options--expanded' : ''}`}>
        <div className="todo-input__row todo-input__row--flex">
          <div>
            <label className="todo-input__label">우선순위</label>
            <select
              className={`todo-input__select todo-input__select--${priority}`}
              value={priority}
              onChange={e => setPriority(e.target.value as Todo['priority'])}
            >
              <option value="high">높음</option>
              <option value="medium">보통</option>
              <option value="low">낮음</option>
            </select>
          </div>

          <div>
            <label className="todo-input__label">마감일</label>
            <DatePicker value={dueDate} onChange={setDueDate} />
          </div>

          <div>
            <label className="todo-input__label">카테고리</label>
            <input
              className="todo-input__field"
              type="text"
              placeholder="예: 업무, 개인..."
              value={category}
              onChange={e => setCategory(e.target.value)}
              list="category-options-input"
            />
            <datalist id="category-options-input">
              {categories.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>
            
          <div>
            <label className="todo-input__label">반복 주기</label>
            <select
              className="todo-input__select"
              value={recurrence}
              onChange={e => setRecurrence(e.target.value as Todo['recurrence'])}
            >
              <option value="none">반복 안 함</option>
              <option value="daily">매일</option>
              <option value="weekly">매주</option>
              <option value="monthly">매월</option>
            </select>
          </div>
        </div>

        <p className="todo-input__hint">📎 메모 연결은 할 일을 저장한 후 카드에서 할 수 있어요.</p>
      </div>

      <button 
        type="button" 
        className={`todo-input__toggle-btn ${isExpanded ? 'todo-input__toggle-btn--expanded' : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? '상세 옵션 접기' : '상세 옵션 열기'}
      </button>
    </form>
  );
}
