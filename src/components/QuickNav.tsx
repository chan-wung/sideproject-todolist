import type { Todo } from '../types/todo';

interface Props {
  filteredTodos: Todo[];
}

export default function QuickNav({ filteredTodos }: Props) {
  function scrollToTodo(id: string) {
    const el = document.getElementById(`todo-item-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  return (
    <nav className="quick-nav">
      <h3 className="quick-nav__tit">항목 네비게이션</h3>
      <ul className="quick-nav__list">
        {filteredTodos.length > 0 ? (
          filteredTodos.map(t => (
            <li key={t.id} className="quick-nav__item" onClick={() => scrollToTodo(t.id)}>
              <span className="quick-nav__item-text">
                {t.pinned && <span className="quick-nav__pin" aria-label="고정됨">📌</span>}
                <span style={{ textDecoration: t.completed ? 'line-through' : 'none', opacity: t.completed ? 0.6 : 1 }}>
                  {t.text.length > 15 ? t.text.slice(0, 15) + '…' : t.text}
                </span>
              </span>
            </li>
          ))
        ) : (
          <li className="quick-nav__item quick-nav__item--empty">해당하는 할 일이 없습니다.</li>
        )}
      </ul>
    </nav>
  );
}
