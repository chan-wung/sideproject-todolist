import { useEffect, useRef } from 'react';

// 자정이 지나거나 탭/PWA가 다시 보이게 되면 onChange를 호출한다 (날짜 기반 표시 갱신용).
export function useDayChange(onChange: () => void) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let timer: number;
    const schedule = () => {
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = window.setTimeout(() => {
        onChangeRef.current();
        schedule();
      }, nextMidnight.getTime() - now.getTime() + 1000);
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') onChangeRef.current();
    };
    schedule();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);
}
