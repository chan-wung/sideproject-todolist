import type { ReactNode } from 'react';
import { VIEW_LABEL, VIEW_OPTIONS, type View } from '../constants/labels';
import { viewHref } from '../hooks/useView';
import { ChecklistIcon, ReportIcon } from './icons';

interface Props {
  current: View;
}

const VIEW_ICON: Record<View, ReactNode> = {
  todos: <ChecklistIcon />,
  report: <ReportIcon />,
};

// 화면 전환 메뉴. 넓은 화면(1024px~)은 왼쪽 사이드바, 좁은 화면은 상단 가로 메뉴로 보인다(CSS로 전환).
// 해시 링크라서 뒤로 가기·새로고침·즐겨찾기가 그대로 동작한다.
export default function AppNav({ current }: Props) {
  return (
    <aside className="app-nav">
      <div className="app-nav__box">
        <a className="app-nav__brand" href={viewHref('todos')}>
          <img className="app-nav__brand-img" src="/logo.svg" alt="" width="40" height="40" />
          <span className="app-nav__brand-tit">Todo List</span>
        </a>
        <nav className="app-nav__wrap" aria-label="주 메뉴">
          <ul className="app-nav__list">
            {VIEW_OPTIONS.map(view => (
              <li key={view} className="app-nav__item">
                <a
                  className="app-nav__link"
                  href={viewHref(view)}
                  aria-current={view === current ? 'page' : undefined}
                >
                  <span className="app-nav__ico">{VIEW_ICON[view]}</span>
                  <span className="app-nav__txt">{VIEW_LABEL[view]}</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
