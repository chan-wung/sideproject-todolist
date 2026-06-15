import type { Todo, FilterStatus } from '../types/todo';
import TodoItem from './TodoItem';

interface Props {
  todos: Todo[];
  filterStatus: FilterStatus;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate: (id: string, updates: Partial<Pick<Todo, 'text' | 'priority' | 'dueDate' | 'category'>>) => void;
  onAddSubtask: (todoId: string, text: string) => void;
  onToggleSubtask: (todoId: string, subId: string) => void;
  onDeleteSubtask: (todoId: string, subId: string) => void;
}

const EMPTY_MESSAGES: Record<FilterStatus, { icon: string; text: string }> = {
  all:       { icon: '📋', text: '할 일이 없어요. 새로운 할 일을 추가해 보세요!' },
  active:    { icon: '🎉', text: '진행 중인 항목이 없어요. 모두 완료했나요?' },
  completed: { icon: '📝', text: '완료된 항목이 없어요.' },
};

export default function TodoList({ todos, filterStatus, onToggle, onDelete, onUpdate, onAddSubtask, onToggleSubtask, onDeleteSubtask }: Props) {
  if (todos.length === 0) {
    const { icon, text } = EMPTY_MESSAGES[filterStatus];
    return (
      <div className="todo-list__empty">
        <span className="todo-list__empty-icon">{icon}</span>
        <p>{text}</p>
      </div>
    );
  }

  return (
    <ul className="todo-list">
      {todos.map(todo => (
        <li key={todo.id}>
          <TodoItem
            todo={todo}
            onToggle={onToggle}
            onDelete={onDelete}
            onUpdate={onUpdate}
            onAddSubtask={onAddSubtask}
            onToggleSubtask={onToggleSubtask}
            onDeleteSubtask={onDeleteSubtask}
          />
        </li>
      ))}
    </ul>
  );
}
