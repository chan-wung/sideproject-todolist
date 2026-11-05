import { useSyncExternalStore } from 'react';
import { DEFAULT_VIEW, VIEW_OPTIONS, type View } from '../constants/labels';

// '#/report' 같은 해시를 화면 이름으로 바꾼다. 모르는 값이면 기본 화면(할 일).
export function parseView(hash: string): View {
  const name = hash.replace(/^#\/?/, '');
  return (VIEW_OPTIONS as string[]).includes(name) ? (name as View) : DEFAULT_VIEW;
}

export function viewHref(view: View): string {
  return `#/${view}`;
}

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange);
  return () => window.removeEventListener('hashchange', onChange);
}

const getSnapshot = () => window.location.hash;

// 현재 화면. 메뉴 링크(<a href="#/report">)를 누르거나 새로고침해도 같은 화면이 유지된다.
export function useView(): View {
  return parseView(useSyncExternalStore(subscribe, getSnapshot));
}
