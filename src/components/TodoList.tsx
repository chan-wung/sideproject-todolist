import { memo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { Todo, FilterStatus, SortKey, TodoUpdates } from '../types/todo';
import type { Memo } from '../types/memo';
import TodoItem from './TodoItem';
import { CheckCircleIcon, ChecklistIcon, NoteIcon } from './icons';
import { cx } from '../utils/classNames';

interface Props {
  todos: Todo[];
  filterStatus: FilterStatus;
  sortKey: SortKey;
  categories: string[];
  memos: Memo[];
  onOpenMemo: (memoId: string) => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onPin: (id: string) => void;
  onCopy: (todo: Todo) => void;
  onShare: (todo: Todo) => void;
  onKakaoShare: (todo: Todo) => void;
  onDuplicate: (id: string) => void;
  onUpdate: (id: string, updates: TodoUpdates) => void;
  onAddSubtask: (todoId: string, text: string) => void;
  onToggleSubtask: (todoId: string, subId: string) => void;
  onDeleteSubtask: (todoId: string, subId: string) => void;
  onToggleSubtasksCollapsed: (id: string) => void;
  onUpdateSubtask: (todoId: string, subId: string, text: string) => void;
  onReorderSubtasks: (todoId: string, fromIndex: number, toIndex: number) => void;
  onReorderTodos: (draggedId: string, targetId: string) => void;
  selectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
}

const EMPTY_MESSAGES: Record<FilterStatus, { icon: ReactNode; text: string }> = {
  all:       { icon: <ChecklistIcon size="1em" />, text: '할 일이 없어요. 새로운 할 일을 추가해 보세요!' },
  active:    { icon: <CheckCircleIcon size="1em" />, text: '진행 중인 항목이 없어요. 모두 완료했나요?' },
  completed: { icon: <NoteIcon size="1em" />, text: '완료된 항목이 없어요.' },
};

function TodoList({ todos, filterStatus, sortKey, categories, memos, onOpenMemo, onToggle, onDelete, onPin, onCopy, onShare, onKakaoShare, onDuplicate, onUpdate, onAddSubtask, onToggleSubtask, onDeleteSubtask, onUpdateSubtask, onReorderSubtasks, onReorderTodos, onToggleSubtasksCollapsed, selectionMode, selectedIds, onToggleSelect }: Props) {
  const manualSort = sortKey === 'manual';
  const dragFromIdRef = useRef<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  if (todos.length === 0) {
    const { icon, text } = EMPTY_MESSAGES[filterStatus];
    return (
      <div className="todo-list__empty">
        <span className="todo-list__empty-icon" aria-hidden="true">{icon}</span>
        <p>{text}</p>
      </div>
    );
  }

  return (
    <ul className="todo-list">
      {todos.map((todo, index) => (
        <li
          key={todo.id}
          className={cx(
            'todo-list__item',
            manualSort ? 'todo-list__item--draggable' : '',
            manualSort && dragOverId === todo.id ? 'todo-list__item--drag-over' : '',
          )}
          draggable={manualSort}
          onDragStart={manualSort ? () => { dragFromIdRef.current = todo.id; } : undefined}
          onDragOver={manualSort ? (e) => { e.preventDefault(); if (dragOverId !== todo.id) setDragOverId(todo.id); } : undefined}
          onDragLeave={manualSort ? () => setDragOverId(current => current === todo.id ? null : current) : undefined}
          onDrop={manualSort ? () => {
            if (dragFromIdRef.current && dragFromIdRef.current !== todo.id) {
              onReorderTodos(dragFromIdRef.current, todo.id);
            }
            dragFromIdRef.current = null;
            setDragOverId(null);
          } : undefined}
          onDragEnd={manualSort ? () => { dragFromIdRef.current = null; setDragOverId(null); } : undefined}
        >
          <TodoItem
            todo={todo}
            categories={categories}
            memos={memos}
            onOpenMemo={onOpenMemo}
            manualSort={manualSort}
            onMoveUp={manualSort && index > 0 ? () => onReorderTodos(todo.id, todos[index - 1].id) : undefined}
            onMoveDown={manualSort && index < todos.length - 1 ? () => onReorderTodos(todo.id, todos[index + 1].id) : undefined}
            selectionMode={selectionMode}
            isSelected={selectedIds?.has(todo.id)}
            onToggleSelect={onToggleSelect}
            onToggle={onToggle}
            onDelete={onDelete}
            onPin={onPin}
            onCopy={onCopy}
            onShare={onShare}
            onKakaoShare={onKakaoShare}
            onDuplicate={onDuplicate}
            onUpdate={onUpdate}
            onAddSubtask={onAddSubtask}
            onToggleSubtask={onToggleSubtask}
            onDeleteSubtask={onDeleteSubtask}
            onUpdateSubtask={onUpdateSubtask}
            onReorderSubtasks={onReorderSubtasks}
            onToggleSubtasksCollapsed={onToggleSubtasksCollapsed}
          />
        </li>
      ))}
    </ul>
  );
}

export default memo(TodoList);
