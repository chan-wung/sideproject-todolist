import { useState } from 'react';
import { flushSync } from 'react-dom';
import type { Todo, CompletionLogEntry, RecurrenceSeries } from '../types/todo';
import type { Memo } from '../types/memo';
import type { ToastState } from './useToast';
import type { WeeklyReportData } from '../utils/weeklyReportData';
import { downloadBackup, readBackupFile } from '../utils/backup';
import { parseBackup, isUnsupportedBackupVersion, BACKUP_VERSION, type ParsedBackup } from '../utils/backupData';
import { unsavedKeysAmong } from '../utils/storage';
import { TODOS_KEY, SERIES_KEY, MEMOS_KEY, COMPLETION_LOG_KEY, WEEKLY_REPORTS_KEY } from '../constants/storageKeys';

// 백업 내보내기·가져오기에 필요한 현재 데이터와 구역별 교체 함수. App이 각 상태 훅에서 모아 넘긴다.
interface Deps {
  memos: Memo[];
  weeklyReports: { data: WeeklyReportData; importData: (incoming: WeeklyReportData) => void };
  exportData: () => Todo[];
  exportCompletionLog: () => CompletionLogEntry[];
  exportRecurrenceSeries: () => RecurrenceSeries[];
  importData: (todos: Todo[]) => boolean;
  replaceMemos: (memos: Memo[]) => boolean;
  importCompletionLog: (entries: CompletionLogEntry[]) => boolean;
  importRecurrenceSeries: (series: RecurrenceSeries[]) => boolean;
  showToast: (state: Omit<ToastState, 'id'>) => void;
  /** 내보내기를 마쳤을 때 (마지막 백업 날짜 기록) */
  markBackedUp: () => void;
  /** 가져온 데이터와 맞지 않게 된 선택 상태를 비운다 */
  clearSelection: () => void;
}

// 백업 내보내기와 가져오기(검증 → 구역별 건수 확인 → 적용 → 저장 결과 확인) 흐름.
export function useBackupFlow(deps: Deps) {
  const { memos, weeklyReports, showToast, markBackedUp, clearSelection } = deps;
  // 검증을 통과한 백업은 바로 적용하지 않고, 어느 구역이 몇 건 교체되는지 보여 준 뒤 확인을 받는다.
  const [pendingImport, setPendingImport] = useState<ParsedBackup | null>(null);

  function getBackup() {
    return {
      version: BACKUP_VERSION,
      todos: deps.exportData(),
      memos,
      completionLog: deps.exportCompletionLog(),
      recurrenceSeries: deps.exportRecurrenceSeries(),
      weeklyReports: weeklyReports.data,
    };
  }

  // 검증을 마친 백업에서 파일에 있던 구역만 덮어쓴다 (생략된 구역은 그대로, 빈 배열은 그 구역을 비움).
  function applyBackup(backup: ParsedBackup) {
    if (backup.todos) deps.importData(backup.todos);
    if (backup.memos) deps.replaceMemos(backup.memos);
    if (backup.completionLog) deps.importCompletionLog(backup.completionLog);
    if (backup.recurrenceSeries) deps.importRecurrenceSeries(backup.recurrenceSeries);
    if (backup.weeklyReports) weeklyReports.importData(backup.weeklyReports);
  }

  function showImportResult(success: boolean) {
    if (success) {
      showToast({ message: '데이터를 성공적으로 불러왔습니다.', type: 'primary' });
    } else {
      showToast({ message: '데이터 불러오기에 실패했습니다.', type: 'danger' });
    }
  }

  function confirmImport() {
    const backup = pendingImport;
    setPendingImport(null);
    if (!backup) return;
    // 상태 반영과 저장(effect)을 끝낸 뒤 저장 결과를 확인한다. 선택 상태는 새 데이터와 맞지 않으므로 비운다.
    flushSync(() => {
      applyBackup(backup);
      clearSelection();
    });
    // 이번에 가져온 구역만 확인한다 (저장 실패뿐 아니라 다른 탭 충돌로 멈춘 것도 저장되지 않은 것이다)
    const touched = [
      backup.todos && TODOS_KEY,
      backup.memos && MEMOS_KEY,
      backup.completionLog && COMPLETION_LOG_KEY,
      backup.recurrenceSeries && SERIES_KEY,
      backup.weeklyReports && WEEKLY_REPORTS_KEY,
    ].filter((k): k is string => !!k);
    if (unsavedKeysAmong(touched).length > 0) {
      showToast({ message: '불러왔지만 브라우저에 저장하지 못한 부분이 있습니다. 화면 위 안내를 확인하고, 먼저 내보내기로 파일을 보관하세요.', type: 'danger' });
    } else {
      showImportResult(true);
    }
  }

  // 프로필 메뉴의 내보내기와 알림 배너의 '지금 내보내기'가 같이 쓴다
  function exportBackup() {
    downloadBackup(getBackup());
    markBackedUp();
    showToast({ message: '데이터를 내보냈습니다.', type: 'success' });
  }

  // 프로필 메뉴의 가져오기: 파일을 읽어(JSON) 검증하고, 통과하면 확인을 받을 수 있게 pendingImport에 담는다
  function importFile(file: File) {
    readBackupFile(file)
      .then(parsed => {
        const backup = parseBackup(parsed);
        if (backup) {
          setPendingImport(backup);
        } else if (isUnsupportedBackupVersion(parsed)) {
          showToast({ message: '이 앱보다 새로운 버전에서 만든 백업이라 불러올 수 없습니다.', type: 'danger' });
        } else {
          showImportResult(false);
        }
      })
      .catch(() => showImportResult(false));
  }

  return {
    pendingImport,
    cancelImport: () => setPendingImport(null),
    confirmImport,
    exportBackup,
    importFile,
  };
}
