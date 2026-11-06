import { useEffect } from 'react';
import type { Todo } from '../types/todo';
import { isToday, isOverdue, todayStr } from '../utils/date';

const NOTIFY_LAST_KEY = 'todolist-notify-last';

// 저장소 접근이 막혀 있어도(사생활 보호 모드 등) 앱이 멈추지 않게 읽는다
function readLastNotified(): string | null {
  try {
    return localStorage.getItem(NOTIFY_LAST_KEY); // 기존 저장 형식(날짜 문자열 그대로)을 유지한다
  } catch {
    return null;
  }
}

async function showNotification(title: string, body: string): Promise<boolean> {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(title, { body, icon: '/pwa-192x192.png' });
    } else {
      new Notification(title, { body });
    }
    return true;
  } catch {
    return false; // 알림 실패는 앱 동작에 영향 없음
  }
}

export function useDueNotifications(todos: Todo[], enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (readLastNotified() === todayStr()) return;

    const dueToday = todos.filter(t => !t.completed && isToday(t.dueDate)).length;
    const overdue = todos.filter(t => !t.completed && isOverdue(t.dueDate)).length;
    if (dueToday === 0 && overdue === 0) return;

    const parts: string[] = [];
    if (overdue > 0) parts.push(`지연 ${overdue}건`);
    if (dueToday > 0) parts.push(`오늘 마감 ${dueToday}건`);
    // 알림이 실제로 떴을 때만 오늘 보냈다고 기록한다
    showNotification('Todo List 마감 알림', parts.join(' · ')).then(shown => {
      if (!shown) return;
      try { localStorage.setItem(NOTIFY_LAST_KEY, todayStr()); } catch { /* 기록 실패는 다음에 다시 알리는 정도라 무시 */ }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]); // 의도적으로 마운트/토글 시에만 — todos 변화마다 재발송하지 않음
}
