import { useEffect, useRef, useState } from 'react';
import type { Todo, TodoKind } from '../types/todo';
import { PRIORITY_LABEL, PRIORITY_OPTIONS, FREQUENCY_LABEL, FREQUENCY_OPTIONS, KIND_LABEL, KIND_OPTIONS, LEAVE_TYPES, type LeaveType } from '../constants/labels';
import { kindAllowsRecurrence, dueDateLabel } from '../utils/kind';
import Toast from './Toast';
import { leaveStatus, type LeaveInput } from '../utils/leave';
import TodoDateField from './TodoDateField';
import LeaveFields from './LeaveFields';
import { PaperclipIcon } from './icons';
import { isImeComposing } from '../utils/ime';
import { EMPTY_TODO_DRAFT, type TodoDraft } from '../utils/todoDraft';

interface Props {
  /** 처음 보여 줄 쓰던 내용. 주면 화면을 옮겼다 돌아와도 이어서 쓸 수 있다 */
  draft?: TodoDraft;
  /**
   * 쓰던 내용을 밖(App)에 맡길 때 불린다: 등록해서 비워질 때와 이 입력창이 사라질 때(화면 이동).
   * 키를 칠 때마다 부르지 않는다 — 부모가 다시 그려지면 카드 수백 장이 함께 다시 그려져 입력이 느려진다.
   */
  onDraftChange?: (draft: TodoDraft) => void;
  /** 값이 바뀌면 쓰던 내용을 비운다 (데이터 초기화 때 부모가 올린다) */
  resetToken?: number;
  onAdd: (text: string, priority: Todo['priority'], dueDate: string, category: string, recurrence?: Todo['recurrence'], kind?: TodoKind, startDate?: string) => void;
  categories: string[];
  /** 그 날짜에 이미 등록된 연차·휴가의 제목들 (같은 연차를 중복 등록하지 않게 막는 데 쓴다) */
  leaveTitlesOn?: (date: string) => string[];
}

const NO_LEAVES = () => [] as string[];

export default function TodoInput({ draft: initialDraft, onDraftChange, resetToken, onAdd, categories, leaveTitlesOn = NO_LEAVES }: Props) {
  // 쓰던 내용은 여기서 들고 있다 (키 입력마다 App 상태를 바꾸지 않는다)
  const [draft, setDraft] = useState<TodoDraft>(initialDraft ?? EMPTY_TODO_DRAFT);
  const { text, priority, startDate, dueDate, category, recurrence, kind, leave } = draft;
  const patchDraft = (changes: Partial<TodoDraft>) => setDraft(prev => ({ ...prev, ...changes }));

  // 화면을 옮겨 이 입력창이 사라질 때 마지막 내용을 부모에게 맡긴다
  const latestDraft = useRef(draft);
  latestDraft.current = draft;
  const onDraftChangeRef = useRef(onDraftChange);
  onDraftChangeRef.current = onDraftChange;
  useEffect(() => () => onDraftChangeRef.current?.(latestDraft.current), []);

  // 부모가 초기화를 요청하면(데이터 초기화) 쓰던 내용을 비운다
  const lastResetToken = useRef(resetToken);
  useEffect(() => {
    if (lastResetToken.current === resetToken) return;
    lastResetToken.current = resetToken;
    setDraft(EMPTY_TODO_DRAFT);
  }, [resetToken]);

  const setText = (v: string) => patchDraft({ text: v });
  const setPriority = (v: Todo['priority']) => patchDraft({ priority: v });
  const setCategory = (v: string) => patchDraft({ category: v });
  const setRecurrence = (v: Todo['recurrence']) => patchDraft({ recurrence: v });
  const setKind = (v: TodoKind) => patchDraft({ kind: v });
  const setLeave = (v: LeaveInput) => patchDraft({ leave: v });
  const [toast, setToast] = useState('');
  const [toastKey, setToastKey] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);

  const isLeave = kind === 'leave';
  // 연차는 날짜가 꼭 필요하니 상세 옵션이 접혀 있어도 펼쳐 둔다
  const optionsOpen = isExpanded || isLeave;
  const leaveState = leaveStatus(leave, dueDate ? leaveTitlesOn(dueDate) : []);

  function warn(message: string) {
    setToast(message);
    setToastKey(k => k + 1);
  }

  // 등록에 성공하면 쓰던 내용을 지운다
  function resetForm() {
    setDraft(EMPTY_TODO_DRAFT);
    onDraftChange?.(EMPTY_TODO_DRAFT);
  }

  // 연차·휴가: 이름·시각·사유를 제목 한 줄로 합쳐 날짜와 함께 등록한다 (날짜가 곧 보고서의 날짜)
  function submitLeave() {
    if (!dueDate) return warn('연차·휴가는 날짜를 선택해 주세요.');
    if (leaveState.duplicate) return warn('이 날 이미 같은 연차·휴가가 등록되어 있습니다.');
    if (!leaveState.canSubmit || !leaveState.text) return warn(leaveState.timeError ?? '연차·휴가 내용을 입력해 주세요.');
    // 우선순위·프로젝트 칸은 연차에서 숨기므로, 일반 업무에서 넣어 둔 값이 따라 들어가지 않게 고정한다
    onAdd(leaveState.text, 'medium', dueDate, '', 'none', 'leave', '');
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
    if (isImeComposing(e)) return; // 한글 조합 중 Enter는 글자 확정이지 등록이 아니다
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  return (
    <form className="todo-input" onSubmit={handleSubmit}>
      {toast && <Toast key={toastKey} message={toast} onClose={() => setToast('')} />}

      {!isLeave && (
        <button
          type="button"
          className={`todo-input__toggle-btn ${isExpanded ? 'todo-input__toggle-btn--expanded' : ''}`}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? '상세 옵션 접기' : '상세 옵션 열기'}
        </button>
      )}

      <div className={`todo-input__options ${optionsOpen ? 'todo-input__options--expanded' : ''}`}>
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

          {!isLeave && (
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
          )}

          <div>
            <label className="todo-input__label" id="todo-input-dueDate-label">{dueDateLabel(kind)}</label>
            <TodoDateField
              kind={kind}
              startDate={startDate}
              dueDate={dueDate}
              onChange={range => patchDraft({ startDate: range.startDate, dueDate: range.dueDate })}
              aria-labelledby="todo-input-dueDate-label"
            />
          </div>

          {isLeave ? (
            <div>
              <label className="todo-input__label" htmlFor="todo-input-leave-type">연차 종류</label>
              <select
                id="todo-input-leave-type"
                className="todo-input__select"
                value={leave.type}
                onChange={e => setLeave({ ...leave, type: e.target.value as LeaveType })}
              >
                {LEAVE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
            </div>
          ) : (
            <>
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
                  value={recurrence}
                  onChange={e => setRecurrence(e.target.value as Todo['recurrence'])}
                >
                  <option value="none">반복 안 함</option>
                  {FREQUENCY_OPTIONS.map(f => <option key={f} value={f}>{FREQUENCY_LABEL[f]}</option>)}
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="todo-input__main-row">
        {isLeave ? (
          <LeaveFields value={leave} onChange={setLeave} date={dueDate} status={leaveState} />
        ) : (
          <textarea
            className="todo-input__field todo-input__field--textarea"
            aria-label="할 일 내용"
            placeholder="크게 할 일을 입력하세요... (줄바꿈: Shift+Enter)"
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            rows={2}
          />
        )}
      </div>

      <div className="todo-input__footer-row">
        {!isLeave && <p className="todo-input__hint"><PaperclipIcon className="ico-text" />메모 연결은 할 일을 저장한 후 카드에서 할 수 있어요.</p>}
        <button className="todo-input__btn" type="submit">추가</button>
      </div>
    </form>
  );
}
