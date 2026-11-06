import { diffDays, todayStr } from './date';

// 데이터는 이 브라우저의 localStorage에만 있어서, 브라우저 데이터를 지우거나 PC를 바꾸면 사라진다.
// 그래서 백업(내보내기)을 오래 안 했으면 알려 준다.

export const BACKUP_INTERVAL_DAYS = 7;

export interface BackupReminder {
  show: boolean;
  message: string;
}

// 알림을 보여 줄지 판단한다.
// - 지울 데이터가 없으면 알리지 않는다.
// - "내일 다시 알림"을 누른 날(snoozedOn)에는 알리지 않는다.
// - 한 번도 백업하지 않았거나 마지막 백업이 7일 이상 지났으면 알린다.
export function backupReminder(input: {
  lastBackup: string | null;
  snoozedOn: string | null;
  hasData: boolean;
  today: string;
}): BackupReminder {
  const { lastBackup, snoozedOn, hasData, today } = input;
  const hidden: BackupReminder = { show: false, message: '' };
  if (!hasData || snoozedOn === today) return hidden;

  if (!lastBackup) {
    return { show: true, message: '아직 백업한 적이 없습니다. 브라우저 데이터가 지워지면 기록이 사라지니 내보내기로 파일을 보관해 두세요.' };
  }
  const days = diffDays(lastBackup, today);
  if (days < BACKUP_INTERVAL_DAYS) return hidden; // 최근에 했거나, 시계가 어긋나 미래 날짜인 경우
  return { show: true, message: `마지막 백업이 ${days}일 전입니다. 그동안 쌓인 기록을 내보내기로 보관해 두세요.` };
}

// 내보내기 파일 이름: todolist-backup-20261104.json
export function backupFileName(today: string): string {
  return `todolist-backup-${today.replace(/-/g, '')}.json`;
}

// 가져오기로 고른 파일을 JSON으로 읽는다. 파일을 못 읽거나 JSON이 아니면 reject한다.
export function readBackupFile(file: Blob): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(String(reader.result)));
      } catch (e) {
        reject(e);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

// 백업 데이터를 JSON 파일로 내려받는다.
export function downloadBackup(data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = backupFileName(todayStr());
  a.click();
  URL.revokeObjectURL(url);
}
