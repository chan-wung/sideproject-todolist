import { useEffect } from 'react';
import { usePersistentState, oneOf } from './usePersistentState';

export type Theme = 'light' | 'dark';

// 라이트/다크 테마. 고른 값은 저장하고, 다크일 때만 body에 data-theme="dark"를 붙인다.
export function useTheme() {
  const [theme, setTheme] = usePersistentState<Theme>('todolist-pref-theme', 'light', oneOf('light', 'dark'));

  useEffect(() => {
    if (theme === 'dark') {
      document.body.dataset.theme = 'dark';
    } else {
      delete document.body.dataset.theme;
    }
  }, [theme]);

  const toggleTheme = () => setTheme(prev => (prev === 'light' ? 'dark' : 'light'));

  return { theme, toggleTheme };
}
