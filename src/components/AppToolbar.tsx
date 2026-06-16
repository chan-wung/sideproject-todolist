import { useEffect } from 'react';
import { usePersistentState } from '../hooks/usePersistentState';

interface Props {
  getBackup: () => unknown;
  applyBackup: (incoming: unknown) => boolean;
  onImportResult: (success: boolean) => void;
  onSettingsOpen: () => void;
}

export default function AppToolbar({ getBackup, applyBackup, onImportResult, onSettingsOpen }: Props) {
  const [theme, setTheme] = usePersistentState<'light' | 'dark'>('todolist-pref-theme', 'light');

  useEffect(() => {
    if (theme === 'dark') {
      document.body.dataset.theme = 'dark';
    } else {
      delete document.body.dataset.theme;
    }
  }, [theme]);

  function handleExport() {
    const data = getBackup();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    const d = new Date();
    const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    a.download = `todolist-backup-${dateStr}.json`;
    
    a.click();
    URL.revokeObjectURL(url);
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
    <div className="app-toolbar">
      <button 
        type="button" 
        className="app-toolbar__btn app-toolbar__btn--theme"
        onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
      >
        {theme === 'light' ? '🌙 다크모드' : '☀️ 라이트모드'}
      </button>
      <div className="app-toolbar__backup">
        <button type="button" className="app-toolbar__btn app-toolbar__btn--export" onClick={handleExport}>
          내보내기
        </button>
        <label className="app-toolbar__btn app-toolbar__btn--import">
          가져오기
          <input type="file" accept="application/json" onChange={handleImport} style={{ display: 'none' }} />
        </label>
      </div>
      <button type="button" className="app-toolbar__btn app-toolbar__btn--settings" onClick={onSettingsOpen} aria-label="설정">
        <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
          <path d="M19.43 12.98c.04-.32.07-.64.07-.98 0-.34-.03-.66-.07-.98l2.11-1.65c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.3-.61-.22l-2.49 1c-.52-.4-1.08-.73-1.69-.98l-.38-2.65C14.46 2.18 14.25 2 14 2h-4c-.25 0-.46.18-.49.42l-.38 2.65c-.61.25-1.17.59-1.69.98l-2.49-1c-.23-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64l2.11 1.65c-.04.32-.07.65-.07.98 0 .33.03.66.07.98l-2.11 1.65c-.19.15-.24.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.03.24.24.42.49.42h4c.25 0 .46-.18.49-.42l.38-2.65c.61-.25 1.17-.58 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.65zM12 15.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/>
        </svg>
        <span className="screen-out">설정</span>
      </button>
    </div>
  );
}
