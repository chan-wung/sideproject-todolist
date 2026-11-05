import type { ReactNode } from 'react';
import { VIEW_LABEL, VIEW_OPTIONS, type View } from '../constants/labels';
import ViewLink from './ViewLink';
import { DashboardIcon, ChecklistIcon, CalendarIcon, NoteIcon, ReportIcon, ChevronLeftIcon } from './icons';

interface Props {
  current: View;
  /** 사이드바를 아이콘만 보이게 접은 상태 (넓은 화면에서만 적용) */
  collapsed: boolean;
  onToggleCollapsed: () => void;
  reportAttention?: boolean;
}

const VIEW_ICON: Record<View, ReactNode> = {
  dashboard: <DashboardIcon />,
  todos: <ChecklistIcon />,
  calendar: <CalendarIcon />,
  memo: <NoteIcon />,
  report: <ReportIcon />,
};

// 화면 전환 메뉴. 넓은 화면(1024px~)은 왼쪽 사이드바, 좁은 화면은 상단 가로 메뉴로 보인다(CSS로 전환).
// 주소(/report) 링크라서 뒤로 가기·새로고침·즐겨찾기가 그대로 동작한다.
export default function AppNav({ current, collapsed, onToggleCollapsed, reportAttention }: Props) {
  const toggleLabel = collapsed ? '메뉴 펼치기' : '메뉴 접기';

  return (
    <aside className={`app-nav${collapsed ? ' app-nav--collapsed' : ''}`}>
      <div className="app-nav__box">
        <ViewLink className="app-nav__brand" view="todos">
          <img className="app-nav__brand-img" src="/logo.svg" alt="" width="40" height="40" />
          <span className="app-nav__brand-tit">Todo List</span>
        </ViewLink>
        <button
          type="button"
          className="app-nav__toggle"
          onClick={onToggleCollapsed}
          aria-expanded={!collapsed}
          aria-label={toggleLabel}
          title={toggleLabel}
        >
          <span className="app-nav__toggle-ico"><ChevronLeftIcon /></span>
        </button>
        <nav className="app-nav__wrap" aria-label="주 메뉴">
          <ul className="app-nav__list">
            {VIEW_OPTIONS.map(view => (
              <li key={view} className="app-nav__item">
                <ViewLink
                  className="app-nav__link"
                  view={view}
                  title={VIEW_LABEL[view]}
                  aria-current={view === current ? 'page' : undefined}
                >
                  <span className="app-nav__ico">{VIEW_ICON[view]}</span>
                  <span className="app-nav__txt">{VIEW_LABEL[view]}</span>
                  {view === 'report' && reportAttention && <span className="app-nav__report-dot" aria-label="지난주 보고 미완료" />}
                </ViewLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </aside>
  );
}
