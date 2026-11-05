import { useEffect, useState } from 'react';
import { usePersistentState } from '../hooks/usePersistentState';
import { useDayChange } from '../hooks/useDayChange';
import { yearProgress } from '../utils/date';
import { downloadBackup } from '../utils/backup';
import { MoonIcon, SunIcon, RepeatIcon, HistoryIcon } from './icons';

interface Props {
  /** 사이드바가 접힌 상태 (넓은 화면에서 툴바 내용이 사이드바 오른쪽부터 시작하도록) */
  navCollapsed: boolean;
  getBackup: () => unknown;
  applyBackup: (incoming: unknown) => boolean;
  onImportResult: (success: boolean) => void;
  onExport: () => void;
  onSettingsOpen: () => void;
  onCompletionLogOpen: () => void;
  onRecurrenceOpen: () => void;
}

export default function AppToolbar({ navCollapsed, getBackup, applyBackup, onImportResult, onExport, onSettingsOpen, onCompletionLogOpen, onRecurrenceOpen }: Props) {
  const [theme, setTheme] = usePersistentState<'light' | 'dark'>('todolist-pref-theme', 'light');

  useEffect(() => {
    if (theme === 'dark') {
      document.body.dataset.theme = 'dark';
    } else {
      delete document.body.dataset.theme;
    }
  }, [theme]);

  const [progress, setProgress] = useState(() => yearProgress());

  // 자정이 지나거나 PWA가 다시 포커스되면 D-day를 새로 계산
  useDayChange(() => setProgress(yearProgress()));

  const ddayLabel = progress.daysLeft === 0 ? 'D-DAY' : `D-${progress.daysLeft}`;

  function handleExport() {
    downloadBackup(getBackup());
    onExport();
  }

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const success = applyBackup(parsed);
        onImportResult(success);
      } catch {
        onImportResult(false);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset file input
  }

  return (
    <div className={`app-toolbar${navCollapsed ? ' app-toolbar--nav-collapsed' : ''}`}>
      <p className="app-toolbar__dday" title={`${progress.year}년이 ${progress.daysLeft}일 남았어요 (${progress.percent}% 지남)`}>
        <span className="screen-out">{progress.year}년 남은 날</span>
        <span className="app-toolbar__dday-num">{ddayLabel}</span>
        <span className="app-toolbar__dday-rate">{progress.percent}%</span>
      </p>
      <button
        type="button" 
        className="app-toolbar__btn app-toolbar__btn--theme"
        onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
      >
        <span className="app-toolbar__ico">{theme === 'light' ? <MoonIcon /> : <SunIcon />}</span>
        {theme === 'light' ? '다크모드' : '라이트모드'}
      </button>
      <div className="app-toolbar__backup">
        <button type="button" className="app-toolbar__btn app-toolbar__btn--export" onClick={handleExport}>
          내보내기
        </button>
        <label className="app-toolbar__btn app-toolbar__btn--import">
          가져오기
          <input type="file" accept="application/json" onChange={handleImport} className="screen-out" />
        </label>
      </div>
      <button type="button" className="app-toolbar__btn app-toolbar__btn--recurrence" onClick={onRecurrenceOpen}>
        <span className="app-toolbar__ico"><RepeatIcon /></span>
        반복 일정
      </button>
      <button type="button" className="app-toolbar__btn app-toolbar__btn--log" onClick={onCompletionLogOpen}>
        <span className="app-toolbar__ico"><HistoryIcon /></span>
        완료 이력
      </button>
      <button type="button" className="app-toolbar__btn app-toolbar__btn--settings" onClick={onSettingsOpen} aria-label="설정">
        <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M19.43 12.98c.04-.32.07-.64.07-.98 0-.34-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98 0 .33.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.58 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/>
        </svg>
        <span className="screen-out">설정</span>
      </button>
    </div>
  );
}
