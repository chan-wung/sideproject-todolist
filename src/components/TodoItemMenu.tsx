import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { useDismiss } from '../hooks/useDismiss';
import type { Todo } from '../types/todo';
import { CopyIcon, ShareIcon, KakaoIcon, DuplicateIcon, MoreIcon, ArrowUpIcon, ArrowDownIcon } from './icons';

interface Props {
  todo: Todo;
  onCopy: (todo: Todo) => void;
  onShare: (todo: Todo) => void;
  onKakaoShare: (todo: Todo) => void;
  onDuplicate: (id: string) => void;
  /** 수동 정렬일 때만 받는다. 보이는 목록에서 바로 위/아래 항목과 자리를 바꾼다(맨 위/맨 아래면 없음) */
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

// 할 일 카드의 "더보기" 버튼과 복사·공유·복제 메뉴
export default function TodoItemMenu({ todo, onCopy, onShare, onKakaoShare, onDuplicate, onMoveUp, onMoveDown }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useDismiss(moreRef, menuOpen, () => setMenuOpen(false), { focusRef: buttonRef });

  const items: { label: string; icon: ReactNode; run: () => void }[] = [
    { label: '클립보드에 복사', icon: <CopyIcon />, run: () => onCopy(todo) },
    { label: '공유', icon: <ShareIcon />, run: () => onShare(todo) },
    { label: '카카오톡 공유', icon: <KakaoIcon />, run: () => onKakaoShare(todo) },
    { label: '할 일 복사', icon: <DuplicateIcon />, run: () => onDuplicate(todo.id) },
    ...(onMoveUp ? [{ label: '위로 이동', icon: <ArrowUpIcon />, run: onMoveUp }] : []),
    ...(onMoveDown ? [{ label: '아래로 이동', icon: <ArrowDownIcon />, run: onMoveDown }] : []),
  ];

  return (
    <div className="todo-item__more" ref={moreRef}>
      <button
        ref={buttonRef}
        type="button"
        className={`todo-item__btn todo-item__btn--more${menuOpen ? ' todo-item__btn--more-active' : ''}`}
        onClick={() => setMenuOpen(prev => !prev)}
        aria-label="더보기"
        aria-expanded={menuOpen}
      >
        <MoreIcon />
      </button>
      {menuOpen && (
        <div className="todo-item__menu">
          {items.map(item => (
            <button
              key={item.label}
              type="button"
              className="todo-item__menu-item"
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
