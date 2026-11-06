import { useState } from 'react';
import { useDayChange } from '../hooks/useDayChange';
import type { Theme } from '../hooks/useTheme';
import { yearProgress } from '../utils/date';
import ProfileMenu, { type ProfileMenuShared } from './ProfileMenu';
import { MoonIcon, SunIcon } from './icons';

interface Props {
  /** 사이드바가 접힌 상태 (넓은 화면에서 툴바 내용이 사이드바 오른쪽부터 시작하도록) */
  navCollapsed: boolean;
  theme: Theme;
  onToggleTheme: () => void;
  /** 좁은 화면(1024px 미만)에서 오른쪽 끝에 보이는 프로필 메뉴에 넘기는 값·동작 */
  profile: ProfileMenuShared;
}

// 상단 띠: 올해 남은 날(D-day), 다크모드 버튼, 사이드바가 없는 좁은 화면용 프로필 메뉴
export default function AppToolbar({ navCollapsed, theme, onToggleTheme, profile }: Props) {
  const [progress, setProgress] = useState(() => yearProgress());

  // 자정이 지나거나 PWA가 다시 포커스되면 D-day를 새로 계산
  useDayChange(() => setProgress(yearProgress()));

  const themeLabel = theme === 'light' ? '다크모드' : '라이트모드';
  const ddayLabel = progress.daysLeft === 0 ? 'D-DAY' : `D-${progress.daysLeft}`;

  return (
    <div className={`app-toolbar${navCollapsed ? ' app-toolbar--nav-collapsed' : ''}`}>
      <p className="app-toolbar__dday" title={`${progress.year}년이 ${progress.daysLeft}일 남았어요 (${progress.percent}% 지남)`}>
        <span className="screen-out">{progress.year}년 남은 날</span>
        <span className="app-toolbar__dday-num">{ddayLabel}</span>
        <span className="app-toolbar__dday-rate">{progress.percent}%</span>
      </p>
      <button type="button" className="app-toolbar__btn" onClick={onToggleTheme} aria-label={themeLabel} title={themeLabel}>
        <span className="app-toolbar__ico">{theme === 'light' ? <MoonIcon /> : <SunIcon />}</span>
      </button>
      <ProfileMenu {...profile} placement="toolbar" />
    </div>
  );
}
