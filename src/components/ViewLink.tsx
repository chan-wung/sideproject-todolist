import type { AnchorHTMLAttributes, MouseEvent } from 'react';
import type { View } from '../constants/labels';
import { navigate, viewHref } from '../hooks/useView';

interface Props extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  view: View;
}

// 다른 화면으로 가는 링크. 진짜 <a href>라서 새 탭 열기·주소 복사가 되고,
// 그냥 누를 때만 페이지를 새로 불러오지 않고 화면만 바꾼다.
export default function ViewLink({ view, onClick, ...rest }: Props) {
  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e);
    // 새 탭·새 창으로 여는 클릭(휠, Ctrl·⌘·Shift·Alt)은 브라우저에 맡긴다
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    navigate(view);
  }

  return <a {...rest} href={viewHref(view)} onClick={handleClick} />;
}
