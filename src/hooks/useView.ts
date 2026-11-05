import { useSyncExternalStore } from 'react';
import { DEFAULT_VIEW, VIEW_OPTIONS, type View } from '../constants/labels';

const VIEW_CHANGE = 'viewchange'; // pushState는 이벤트를 내지 않아, 화면을 옮길 때 우리가 직접 알린다

function isView(name: string): name is View {
  return (VIEW_OPTIONS as string[]).includes(name);
}

// '/report' 같은 주소(옛 '#/report' 해시도 같이)를 화면 이름으로 바꾼다. 모르는 값이면 기본 화면(할 일).
export function parseView(path: string): View {
  const name = path.replace(/^#?\/?/, '').replace(/\/+$/, '');
  return isView(name) ? name : DEFAULT_VIEW;
}

export function viewHref(view: View): string {
  return `/${view}`;
}

// 화면을 옮긴다. 주소만 바꾸고 페이지는 새로 불러오지 않으며, 뒤로 가기로 돌아올 수 있다.
export function navigate(view: View) {
  if (window.location.pathname === viewHref(view)) return;
  window.history.pushState(null, '', viewHref(view));
  window.dispatchEvent(new Event(VIEW_CHANGE));
}

// 해시 주소 시절의 북마크('/#/report')로 들어오면 해시 없는 주소('/report')로 바꿔 둔다.
export function migrateLegacyHash() {
  const { hash } = window.location;
  if (!hash.startsWith('#/')) return;
  const name = hash.slice(2);
  if (isView(name)) window.history.replaceState(null, '', viewHref(name));
}

function subscribe(onChange: () => void) {
  window.addEventListener('popstate', onChange);
  window.addEventListener(VIEW_CHANGE, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(VIEW_CHANGE, onChange);
  };
}

const getSnapshot = () => window.location.pathname;

// 현재 화면. 메뉴 링크(<ViewLink view="report">)를 누르거나 새로고침·뒤로 가기를 해도 같은 화면이 유지된다.
export function useView(): View {
  return parseView(useSyncExternalStore(subscribe, getSnapshot));
}
