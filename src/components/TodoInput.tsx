import { useState } from 'react';
import type { Todo, TodoKind } from '../types/todo';
import { PRIORITY_LABEL, PRIORITY_OPTIONS, FREQUENCY_LABEL, FREQUENCY_OPTIONS, KIND_LABEL, KIND_OPTIONS } from '../constants/labels';
import { kindAllowsRecurrence, dueDateLabel } from '../utils/kind';
import Toast from './Toast';
import { leaveStatus, type LeaveInput } from '../utils/leave';
import TodoDateField from './TodoDateField';
import LeaveFields from './LeaveFields';
import { PaperclipIcon } from './icons';

interface Props {
  onAdd: (text: string, priority: Todo['priority'], dueDate: string, category: string, recurrence?: Todo['recurrence'], kind?: TodoKind, startDate?: string) => void;
  categories: string[];
  /** 그 날짜에 이미 등록된 연차·휴가의 제목들 (같은 연차를 중복 등록하지 않게 막는 데 쓴다) */
  leaveTitlesOn?: (date: string) => string[];
}

const EMPTY_LEAVE: LeaveInput = { type: 'annual', start: '', end: '', name: '', reason: '' };
const NO_LEAVES = () => [] as string[];

export default function TodoInput({ onAdd, categories, leaveTitlesOn = NO_LEAVES }: Props) {
  const [text, setText] = useState('');
  const [priority, setPriority] = useState<Todo['priority']>('medium');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState('');
  const [recurrence, setRecurrence] = useState<Todo['recurrence']>('none');
  const [kind, setKind] = useState<TodoKind>('task');
  const [leave, setLeave] = useState<LeaveInput>(EMPTY_LEAVE);
  const [toast, setToast] = useState('');
  const [toastKey, setToastKey] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const isLeave = kind === 'leave';
  const leaveState = leaveStatus(leave, dueDate ? leaveTitlesOn(dueDate) : []);

  function warn(message: string) {
    setToast(message);
    setToastKey(k => k + 1);
  }

  function resetForm() {
    setText('');
    setStartDate('');
    setDueDate('');
    setCategory('');
    setPriority('medium');
    setRecurrence('none');
    setKind('task');
    setLeave(EMPTY_LEAVE);
  }

  // 연차·휴가: 이름·시각·사유를 제목 한 줄로 합쳐 날짜와 함께 등록한다 (날짜가 곧 보고서의 날짜)
  function submitLeave() {
    if (!dueDate) return warn('연차·휴가는 날짜를 선택해 주세요.');
    if (leaveState.duplicate) return warn('이 날 이미 같은 연차·휴가가 등록되어 있습니다.');
    if (!leaveState.canSubmit || !leaveState.text) return warn(leaveState.timeError ?? '연차·휴가 내용을 입력해 주세요.');
    onAdd(leaveState.text, priority, dueDate, category, 'none', 'leave', '');
    resetForm();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isLeave) return submitLeave();
    if (!text.trim()) {
      warn('할 일 내용을 입력해 주세요.');
      setText('');
      return;
    }
    // 시작일은 기간을 받는 종류에서만 쓴다. 반복 일정의 회차는 마감일을 기준으로 만들어지므로 반복이면 쓰지 않는다.
    const repeats = kindAllowsRecurrence(kind) && !!recurrence && recurrence !== 'none';
    onAdd(text, priority, dueDate, category, kindAllowsRecurrence(kind) ? recurrence : 'none', kind, repeats ? '' : startDate);
    resetForm();
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
            <TodoDateField
              kind={kind}
              startDate={startDate}
              dueDate={dueDate}
              onChange={range => { setStartDate(range.startDate); setDueDate(range.dueDate); }}
              aria-labelledby="todo-input-dueDate-label"
            />
          </div>

          <div>
            <label className="todo-input__label" htmlFor="todo-input-category">프로젝트</label>
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
        {isLeave ? (
          <LeaveFields value={leave} onChange={setLeave} date={dueDate} status={leaveState} />
        ) : (
          <textarea
            className="todo-input__field todo-input__field--textarea"
            placeholder="크게 할 일을 입력하세요... (줄바꿈: Shift+Enter)"
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            rows={2}
          />
        )}
      </div>

      <div className="todo-input__footer-row">
        <p className="todo-input__hint"><PaperclipIcon className="ico-text" />메모 연결은 할 일을 저장한 후 카드에서 할 수 있어요.</p>
        <button className="todo-input__btn" type="submit">추가</button>
      </div>
    </form>
  );
}
