import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useDismiss } from '../hooks/useDismiss';
import type { Todo } from '../types/todo';
import { CopyIcon, ShareIcon, KakaoIcon, DuplicateIcon, MoreIcon } from './icons';

interface Props {
  todo: Todo;
  onCopy: (todo: Todo) => void;
  onShare: (todo: Todo) => void;
  onKakaoShare: (todo: Todo) => void;
  onDuplicate: (id: string) => void;
}

// 할 일 카드의 "더보기" 버튼과 복사·공유·복제 메뉴
export default function TodoItemMenu({ todo, onCopy, onShare, onKakaoShare, onDuplicate }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useDismiss(moreRef, menuOpen, () => setMenuOpen(false));

  const items: { label: string; icon: ReactNode; run: () => void }[] = [
    { label: '클립보드에 복사', icon: <CopyIcon />, run: () => onCopy(todo) },
    { label: '공유', icon: <ShareIcon />, run: () => onShare(todo) },
    { label: '카카오톡 공유', icon: <KakaoIcon />, run: () => onKakaoShare(todo) },
    { label: '할 일 복사', icon: <DuplicateIcon />, run: () => onDuplicate(todo.id) },
  ];

  return (
    <div className="todo-item__more" ref={moreRef}>
      <button
        type="button"
        className={`todo-item__btn todo-item__btn--more${menuOpen ? ' todo-item__btn--more-active' : ''}`}
        onClick={() => setMenuOpen(prev => !prev)}
        aria-label="더보기"
        aria-haspopup="true"
        aria-expanded={menuOpen}
      >
        <MoreIcon />
      </button>
      {menuOpen && (
        <div className="todo-item__menu" role="menu">
          {items.map(item => (
            <button
              key={item.label}
              type="button"
              className="todo-item__menu-item"
              role="menuitem"
              onClick={() => { setMenuOpen(false); item.run(); }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
