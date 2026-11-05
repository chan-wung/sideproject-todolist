import { VIEW_LABEL, VIEW_OPTIONS, type View } from '../constants/labels';
import { viewHref } from '../hooks/useView';

interface Props {
  current: View;
}

// 화면 전환 메뉴. 해시 링크라서 뒤로 가기·새로고침·즐겨찾기가 그대로 동작한다.
export default function AppNav({ current }: Props) {
  return (
    <nav className="app-nav" aria-label="주 메뉴">
      <div className="app-nav__box">
        <ul className="app-nav__list">
          {VIEW_OPTIONS.map(view => (
            <li key={view} className="app-nav__item">
              <a
                className="app-nav__link"
                href={viewHref(view)}
                aria-current={view === current ? 'page' : undefined}
              >
                {VIEW_LABEL[view]}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
