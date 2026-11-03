import { useRef, useState } from 'react';
import type { Todo } from '../types/todo';
import { CheckIcon, CloseIcon, DragHandleIcon, EditIcon } from './icons';

interface Props {
  todo: Todo;
  onAddSubtask: (todoId: string, text: string) => void;
  onToggleSubtask: (todoId: string, subId: string) => void;
  onDeleteSubtask: (todoId: string, subId: string) => void;
  onUpdateSubtask: (todoId: string, subId: string, text: string) => void;
  onReorderSubtasks: (todoId: string, fromIndex: number, toIndex: number) => void;
}

// 할 일 카드의 하위 항목 목록(체크·수정·삭제·드래그 정렬)과 추가 입력
export default function TodoItemSubtasks({ todo, onAddSubtask, onToggleSubtask, onDeleteSubtask, onUpdateSubtask, onReorderSubtasks }: Props) {
  const [subText, setSubText] = useState('');
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editSubText, setEditSubText] = useState('');
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragFromRef = useRef<number | null>(null);

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

  return (
    <>
      <div className={`todo-item__subtasks${todo.subtasksCollapsed ? ' todo-item__subtasks--collapsed' : ''}`} id={`todo-subtasks-${todo.id}`}>
        {(todo.subtasks ?? []).map((sub, index) => (
          <div
            key={sub.id}
            className={['todo-item__subtask', dragOverIndex === index ? 'todo-item__subtask--drag-over' : ''].filter(Boolean).join(' ')}
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
                  value={editSubText}
                  onChange={e => setEditSubText(e.target.value)}
                  onKeyDown={e => {
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
