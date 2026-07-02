import { useEffect } from 'react';
import type { Todo } from '../types/todo';
import { isToday, isOverdue } from '../utils/date';

const NOTIFY_LAST_KEY = 'todolist-notify-last';

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function showNotification(title: string, body: string) {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) {
      await reg.showNotification(title, { body, icon: '/pwa-192x192.png' });
    } else {
      new Notification(title, { body });
    }
  } catch {
    // 알림 실패는 조용히 무시 (앱 동작에 영향 없음)
  }
}

export function useDueNotifications(todos: Todo[], enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    if (!('Notification' in window) || Notification.permission !== 'granted') return;
    if (localStorage.getItem(NOTIFY_LAST_KEY) === todayStr()) return;

    const dueToday = todos.filter(t => !t.completed && isToday(t.dueDate)).length;
    const overdue = todos.filter(t => !t.completed && isOverdue(t.dueDate)).length;
    if (dueToday === 0 && overdue === 0) return;

    const parts: string[] = [];
    if (overdue > 0) parts.push(`지연 ${overdue}건`);
    if (dueToday > 0) parts.push(`오늘 마감 ${dueToday}건`);
    showNotification('Todo List 마감 알림', parts.join(' · '));
    localStorage.setItem(NOTIFY_LAST_KEY, todayStr());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]); // 의도적으로 마운트/토글 시에만 — todos 변화마다 재발송하지 않음
}
