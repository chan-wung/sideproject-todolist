import { useState } from 'react';
import { usePersistentState } from './usePersistentState';
import { useDayChange } from './useDayChange';
import { backupReminder } from '../utils/backup';
import { todayStr } from '../utils/date';

const LAST_BACKUP_KEY = 'todolist-last-backup';
const SNOOZE_KEY = 'todolist-backup-snooze';

// 마지막 백업(내보내기) 날짜를 기억하고, 오래 안 했으면 알림을 보여 줄지 알려 준다.
// hasData: 지킬 기록이 하나라도 있는지 (없으면 알리지 않는다)
export function useBackupReminder(hasData: boolean) {
  const [lastBackup, setLastBackup] = usePersistentState<string | null>(LAST_BACKUP_KEY, null);
  const [snoozedOn, setSnoozedOn] = usePersistentState<string | null>(SNOOZE_KEY, null);
  const [today, setToday] = useState(todayStr);

  // 자정이 지나면 '내일 다시 알림'이 풀리도록 날짜를 새로 읽는다.
  useDayChange(() => setToday(todayStr()));

  return {
    lastBackup,
    reminder: backupReminder({ lastBackup, snoozedOn, hasData, today }),
    /** 방금 내보냈다 */
    markBackedUp: () => setLastBackup(todayStr()),
    /** 오늘은 그만 알린다 (내일 다시 알림) */
    snooze: () => setSnoozedOn(todayStr()),
  };
}
