import { useRef, useState } from 'react';
import type { Todo } from '../types/todo';
import { ArrowDownIcon, ArrowUpIcon, CheckIcon, CloseIcon, DragHandleIcon, EditIcon } from './icons';
import { cx } from '../utils/classNames';
import { isImeComposing } from '../utils/ime';

interface Props {
  todo: Todo;
  /** 쓰던 하위 항목 입력. 주면 카드를 편집 모드로 바꿨다 돌아와도 유지된다 */
  subText?: string;
  onSubTextChange?: (text: string) => void;
  onAddSubtask: (todoId: string, text: string) => void;
  onToggleSubtask: (todoId: string, subId: string) => void;
  onDeleteSubtask: (todoId: string, subId: string) => void;
  onUpdateSubtask: (todoId: string, subId: string, text: string) => void;
  onReorderSubtasks: (todoId: string, fromIndex: number, toIndex: number) => void;
}

// 할 일 카드의 하위 항목 목록(체크·수정·삭제·드래그 정렬)과 추가 입력
export default function TodoItemSubtasks({ todo, subText: outerSubText, onSubTextChange, onAddSubtask, onToggleSubtask, onDeleteSubtask, onUpdateSubtask, onReorderSubtasks }: Props) {
  const [localSubText, setLocalSubText] = useState('');
  const subText = outerSubText ?? localSubText;
  const setSubText = onSubTextChange ?? setLocalSubText;
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editSubText, setEditSubText] = useState('');
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragFromRef = useRef<number | null>(null);
  const total = (todo.subtasks ?? []).length;

  function handleAddSubtask() {
    if (!subText.trim()) return;
    onAddSubtask(todo.id, subText);
    setSubText('');
  }

  function handleSubtaskKeyDown(e: React.KeyboardEvent) {
    if (isImeComposing(e)) return;
    if (e.key === 'Enter') handleAddSubtask();
  }

  function handleSaveSubEdit(subId: string) {
    if (!editSubText.trim()) return;
    onUpdateSubtask(todo.id, subId, editSubText);
    setEditingSubId(null);
  }

  return (
    <>
      <div className={`todo-item__subtasks${todo.subtasksCollapsed ? ' todo-item__subtasks--collapsed' : ''}`} id={`todo-subtasks-${todo.id}`}>
        {(todo.subtasks ?? []).map((sub, index) => (
          <div
            key={sub.id}
            className={cx('todo-item__subtask', dragOverIndex === index ? 'todo-item__subtask--drag-over' : '')}
            draggable={editingSubId !== sub.id}
            onDragStart={(e) => { e.stopPropagation(); dragFromRef.current = index; }}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); if (dragOverIndex !== index) setDragOverIndex(index); }}
            onDragLeave={() => setDragOverIndex(null)}
            onDrop={(e) => {
              e.stopPropagation();
              if (dragFromRef.current !== null && dragFromRef.current !== index) {
                onReorderSubtasks(todo.id, dragFromRef.current, index);
              }
              setDragOverIndex(null);
              dragFromRef.current = null;
            }}
            onDragEnd={(e) => { e.stopPropagation(); setDragOverIndex(null); dragFromRef.current = null; }}
          >
            {editingSubId === sub.id ? (
              <div className="todo-item__sub-edit">
                <input
                  className="todo-item__edit-field todo-item__edit-field--sm"
                  type="text"
                  aria-label="하위 항목 수정"
                  value={editSubText}
                  onChange={e => setEditSubText(e.target.value)}
                  onKeyDown={e => {
                    if (isImeComposing(e)) return;
                    if (e.key === 'Enter') handleSaveSubEdit(sub.id);
                    if (e.key === 'Escape') setEditingSubId(null);
                  }}
                  autoFocus
                />
                <button type="button" className="todo-item__btn-sub-action todo-item__btn-sub-action--save" onClick={() => handleSaveSubEdit(sub.id)} aria-label="저장">
                  <CheckIcon />
                  <span className="screen-out">저장</span>
                </button>
                <button type="button" className="todo-item__btn-sub-action todo-item__btn-sub-action--cancel" onClick={() => setEditingSubId(null)} aria-label="취소">
                  <CloseIcon />
                  <span className="screen-out">취소</span>
                </button>
              </div>
            ) : (
              <>
                <span className="todo-item__sub-drag" aria-hidden="true">
                  <DragHandleIcon />
                </span>
                <label className="form-chk form-chk--checkbox">
                  <input
                    className="todo-item__sub-chk"
                    type="checkbox"
                    checked={sub.completed}
                    onChange={() => onToggleSubtask(todo.id, sub.id)}
                  />
                  <span className="form-chk__text">{sub.text}</span>
                </label>
                {total > 1 && (
                  <>
                    <button
                      type="button"
                      className="todo-item__btn-sub-move"
                      onClick={() => onReorderSubtasks(todo.id, index, index - 1)}
                      disabled={index === 0}
                      aria-label={`위로 이동: ${sub.text}`}
                    >
                      <ArrowUpIcon />
                    </button>
                    <button
                      type="button"
                      className="todo-item__btn-sub-move"
                      onClick={() => onReorderSubtasks(todo.id, index, index + 1)}
                      disabled={index === total - 1}
                      aria-label={`아래로 이동: ${sub.text}`}
                    >
                      <ArrowDownIcon />
                    </button>
                  </>
                )}
                <button
                  type="button"
                  className="todo-item__btn-sub-edit"
                  onClick={() => { setEditingSubId(sub.id); setEditSubText(sub.text); }}
                  aria-label="하위 항목 수정"
                >
                  <EditIcon />
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
          className="todo-item__sub-add-field"
          aria-label="새 하위 항목 내용"
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
    </>
  );
}
