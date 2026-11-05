import type { Todo } from '../types/todo';
import { PinIcon } from './icons';
import { truncate } from '../utils/text';

interface Props {
  filteredTodos: Todo[];
}

const LABEL_MAX = 15; // 칩에 보여 주는 제목 최대 글자 수 (넘으면 …)

// 목록 위 가로 한 줄 바로가기. 칩을 누르면 그 할 일 카드로 스크롤한다. 항목이 없으면 보여 주지 않는다.
export default function QuickNav({ filteredTodos }: Props) {
  if (filteredTodos.length === 0) return null;

  function scrollToTodo(id: string) {
    const el = document.getElementById(`todo-item-${id}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  return (
    <nav className="quick-nav" aria-label="항목 네비게이션">
      <span className="quick-nav__tit" aria-hidden="true">항목 이동</span>
      <ul className="quick-nav__list">
        {filteredTodos.map(t => (
          <li key={t.id} className="quick-nav__item">
            <button type="button" className="quick-nav__btn" onClick={() => scrollToTodo(t.id)} title={t.text}>
              {t.pinned && <span className="quick-nav__pin" role="img" aria-label="고정됨"><PinIcon filled size="1em" /></span>}
              <span className={`quick-nav__item-label${t.completed ? ' quick-nav__item-label--completed' : ''}`}>
                {truncate(t.text, LABEL_MAX)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
