import { useEffect } from 'react';
import { usePersistentState } from '../hooks/usePersistentState';
import type { Todo } from '../types/todo';

interface Props {
  exportData: () => Todo[];
  importData: (incoming: unknown) => boolean;
  onImportResult: (success: boolean) => void;
}

export default function AppToolbar({ exportData, importData, onImportResult }: Props) {
  const [theme, setTheme] = usePersistentState<'light' | 'dark'>('todolist-pref-theme', 'light');

  useEffect(() => {
    if (theme === 'dark') {
      document.body.dataset.theme = 'dark';
    } else {
      delete document.body.dataset.theme;
    }
  }, [theme]);

  function handleExport() {
    const data = exportData();
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
        const success = importData(parsed);
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
        <button type="button" className="app-toolbar__btn" onClick={handleExport}>
          📥 내보내기
        </button>
        <label className="app-toolbar__btn app-toolbar__btn--import">
          📤 가져오기
          <input type="file" accept="application/json" onChange={handleImport} style={{ display: 'none' }} />
        </label>
      </div>
    </div>
  );
}
