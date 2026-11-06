import { useState, useEffect, useCallback } from 'react';
import { useTodos } from './hooks/useTodos';
import { useMemos } from './hooks/useMemos';
import { useWeeklyReports } from './hooks/useWeeklyReports';
import { useDueNotifications } from './hooks/useDueNotifications';
import { usePersistentState } from './hooks/usePersistentState';
import { useSelection } from './hooks/useSelection';
import { useView, navigate } from './hooks/useView';
import { useBackupReminder } from './hooks/useBackupReminder';
import { useToast } from './hooks/useToast';
import { useShareActions } from './hooks/useShareActions';
import { useTheme } from './hooks/useTheme';
import TodoPage from './pages/TodoPage';
import { EMPTY_TODO_DRAFT, type TodoDraft } from './utils/todoDraft';
import WeeklyReportPage from './pages/WeeklyReportPage';
import CalendarPage from './pages/CalendarPage';
import DashboardPage from './pages/DashboardPage';
import AppNav from './components/AppNav';
import BackupReminder from './components/BackupReminder';
import StorageNotice from './components/StorageNotice';
import { useStorageStatus } from './hooks/useStorageStatus';
import { retryFailedWrites, readCorruptBackups, discardCorruptBackups } from './utils/storage';
import Toast from './components/Toast';
import ScrollTopButton from './components/ScrollTopButton';
import MemoPage from './pages/MemoPage';
import AppToolbar from './components/AppToolbar';
import type { ProfileMenuShared } from './components/ProfileMenu';
import SettingsModal from './components/SettingsModal';
import CompletionLogModal from './components/CompletionLogModal';
import RecurrenceSeriesModal from './components/RecurrenceSeriesModal';
import type { Todo, CompletionLogEntry } from './types/todo';
import { normalizeKind } from './utils/kind';
import { hasUnreportedWeek, shiftWeek } from './utils/weeklyReport';
import { startOfWeek, todayStr } from './utils/date';
import { downloadCorruptBackups } from './utils/backup';
import { summarizeBackup } from './utils/backupData';
import { useBackupFlow } from './hooks/useBackupFlow';
import ConfirmModal from './components/ConfirmModal';
import { todoToText, completionLogEntryToText, completionLogEntriesToText } from './utils/share';
import './styles/main.scss';

export default function App() {
  const {
    allTodos,
    filteredTodos,
    filterStatus,
    setFilterStatus,
    filterCategory,
    setFilterCategory,
    sortKey,
    setSortKey,
    query,
    setQuery,
    dueScope,
    setDueScope,
    recurrenceOnly,
    setRecurrenceOnly,
    completionLog,
    resetCompletionLog,
    deleteCompletionLogEntry,
    exportCompletionLog,
    importCompletionLog,
    categories,
    categoryOptions,
    activeCount,
    completedCount,
    dueTodayCount,
    overdueCount,
    addTodo,
    toggleTodo,
    deleteTodo,
    duplicateTodo,
    updateTodo,
    pinTodo,
    reorderTodos,
    bulkUpdateCategory,
    bulkUpdatePriority,
    bulkDelete,
    pruneMemoLinks,
    clearCompleted,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    updateSubtask,
    reorderSubtasks,
    toggleSubtasksCollapsed,
    collapseAllSubtasks,
    expandAllSubtasks,
    exportData,
    importData,
    resetTodos,
    recurrenceSeries,
    addRecurrenceSeries,
    updateRecurrenceSeries,
    endRecurrenceSeries,
    resumeRecurrenceSeries,
    deleteRecurrenceSeries,
    exportRecurrenceSeries,
    importRecurrenceSeries,
    undoMessage,
    undoId,
    performUndo,
    dismissUndo,
    linkMemoToTodo,
    unlinkMemoFromTodo,
  } = useTodos();

  const todosWithSubtasks = allTodos.filter(t => t.subtasks && t.subtasks.length > 0);
  const hasSubtasks = todosWithSubtasks.length > 0;
  const allCollapsed = hasSubtasks && todosWithSubtasks.every(t => t.subtasksCollapsed);

  const { memos, setMemos, activeId, setActiveId, resetMemos, replaceMemos } = useMemos();
  const weeklyReports = useWeeklyReports();

  // 없어진 메모의 연결을 지운다. 메모 목록(id)이 바뀔 때, 그리고 가져오기 등으로 할 일·반복 일정이 통째로 바뀔 때 돈다.
  // 메모 글을 쓸 때는 id가 그대로라 돌지 않고, 지울 연결이 없으면 상태를 바꾸지 않아 다시 그리지 않는다.
  const memoIdsKey = memos.map(m => m.id).join('|');
  useEffect(() => {
    pruneMemoLinks(memoIdsKey ? memoIdsKey.split('|') : []);
  }, [memoIdsKey, allTodos, recurrenceSeries, pruneMemoLinks]);

  const [notifyEnabled, setNotifyEnabled] = usePersistentState<boolean>('todolist-pref-notify', false);
  useDueNotifications(allTodos, notifyEnabled);

  const view = useView();
  // 화면(메뉴)을 옮기면 이전 화면의 스크롤 위치를 가져가지 않고 맨 위부터 보여 준다
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); // html에 smooth가 걸려 있어 즉시 이동을 지정
  }, [view]);

  // 지난주 보고를 아직 안 냈는지: 사이드바 알림 점과 주간보고 화면 안내가 같은 값을 쓴다
  const lastWeekStart = shiftWeek(startOfWeek(todayStr()), -1);
  const hasUnreportedLastWeek = hasUnreportedWeek({
    weekStart: lastWeekStart,
    todos: allTodos,
    completionLog,
    drafts: weeklyReports.data.drafts,
    copiedWeeks: weeklyReports.data.copiedWeeks,
  });

  const hasData = allTodos.length > 0 || memos.length > 0 || completionLog.length > 0 || recurrenceSeries.length > 0 || Object.keys(weeklyReports.data.drafts).length > 0 || weeklyReports.data.copiedWeeks.length > 0;
  const storageStatus = useStorageStatus();
  const { lastBackup, reminder, markBackedUp, snooze } = useBackupReminder(hasData);
  const [navCollapsed, setNavCollapsed] = usePersistentState<boolean>('todolist-pref-nav-collapsed', false);

  const { toast, showToast, clearToast } = useToast();
  // 복사·공유 토스트가 실행취소 토스트를 대신하면 그 실행취소는 더 이상 누를 수 없으니 함께 버린다
  const showShareToast = useCallback((state: Parameters<typeof showToast>[0]) => {
    dismissUndo();
    showToast(state);
  }, [dismissUndo, showToast]);
  const { runCopy, runShare, runKakaoShare } = useShareActions(showShareToast);

  // undoId가 바뀔 때마다(같은 문구의 연속 삭제 포함) 토스트와 5초 유예를 새로 시작한다
  useEffect(() => {
    if (!undoMessage) return;
    showToast({
      message: undoMessage,
      actionLabel: '실행취소',
      onAction: performUndo,
      duration: 5000,
      type: 'danger',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [undoId, performUndo, showToast]);

  // 할 일 입력창에 쓰던 내용. 화면을 옮기면 입력창이 사라지므로 App이 들고 있다가 돌아오면 돌려준다.
  const [todoDraft, setTodoDraft] = useState<TodoDraft>(EMPTY_TODO_DRAFT);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const {
    selectionMode,
    selectedIds,
    toggleMode: handleToggleSelectionMode,
    toggle: handleToggleSelect,
    selectAll,
    clear: handleClearSelection,
  } = useSelection();

  const { pendingImport, cancelImport, confirmImport, exportBackup, importFile } = useBackupFlow({
    memos,
    weeklyReports,
    exportData,
    exportCompletionLog,
    exportRecurrenceSeries,
    importData,
    replaceMemos,
    importCompletionLog,
    importRecurrenceSeries,
    showToast,
    markBackedUp,
    clearSelection: handleClearSelection,
  });

  function handleSelectAll() {
    selectAll(filteredTodos.map(t => t.id));
  }

  function handleBulkCategory(category: string) {
    bulkUpdateCategory(Array.from(selectedIds), category);
    showToast({ message: '선택한 항목의 프로젝트를 변경했습니다.' });
  }

  function handleBulkPriority(priority: Todo['priority']) {
    bulkUpdatePriority(Array.from(selectedIds), priority);
    showToast({ message: '선택한 항목의 우선순위를 변경했습니다.' });
  }

  function handleBulkDelete() {
    bulkDelete(Array.from(selectedIds));
    handleClearSelection();
  }

  const handleCopyTodo = (todo: Todo) => runCopy(todoToText(todo), '할 일을 클립보드에 복사했습니다.');
  const handleShareTodo = (todo: Todo) => runShare('할 일 공유', todoToText(todo));
  const handleKakaoShareTodo = (todo: Todo) => runKakaoShare(todoToText(todo));

  function handleDuplicateTodo(id: string) {
    duplicateTodo(id);
    showToast({ message: '할 일을 복사해서 아래에 추가했습니다.', type: 'success' });
  }

  function handleResetTodos() {
    resetTodos();
    setTodoDraft(EMPTY_TODO_DRAFT);
    handleClearSelection();
    showToast({ message: '할일을 초기화했습니다.', type: 'danger' });
  }

  function handleResetMemos() {
    resetMemos();
    showToast({ message: '메모를 초기화했습니다.', type: 'danger' });
  }

  // 전체 초기화: 할 일·메모·완료 이력·반복 일정·주간보고(저장본·복사 기록)를 모두 비운다. 테마·이름 같은 설정은 유지한다.
  function handleResetAll() {
    resetTodos();
    setTodoDraft(EMPTY_TODO_DRAFT);
    handleClearSelection();
    resetMemos();
    resetCompletionLog();
    weeklyReports.reset();
    showToast({ message: '전체 데이터를 초기화했습니다.', type: 'danger' });
  }

  function handleResetCompletionLog() {
    resetCompletionLog();
    showToast({ message: '완료 이력을 초기화했습니다.', type: 'danger' });
  }

  function handleDeleteLogEntry(entry: CompletionLogEntry) {
    deleteCompletionLogEntry(entry);
    showToast({ message: '완료 이력을 삭제했습니다.', type: 'danger' });
  }

  const LOG_COPIED_MESSAGE = '완료 이력을 클립보드에 복사했습니다.';
  const handleCopyLogEntry = (entry: CompletionLogEntry) => runCopy(completionLogEntryToText(entry), LOG_COPIED_MESSAGE);
  const handleShareLogEntry = (entry: CompletionLogEntry) => runShare('완료 이력 공유', completionLogEntryToText(entry));
  const handleCopyAllLog = (entries: CompletionLogEntry[]) => runCopy(completionLogEntriesToText(entries), LOG_COPIED_MESSAGE);
  const handleShareAllLog = (entries: CompletionLogEntry[]) => runShare('완료 이력 공유', completionLogEntriesToText(entries));
  const handleKakaoShareAllLog = (entries: CompletionLogEntry[]) => runKakaoShare(completionLogEntriesToText(entries));

  const [isCompletionLogOpen, setIsCompletionLogOpen] = useState(false);

  const [isRecurrenceOpen, setIsRecurrenceOpen] = useState(false);

  // 다크모드 버튼은 툴바에 두고, 프로필 메뉴(넓은 화면은 사이드바 아래, 좁은 화면은 툴바 오른쪽)가 같이 쓰는 값·동작은 아래에 모은다
  const { theme, toggleTheme } = useTheme();
  const [profileName, setProfileName] = usePersistentState<string>('todolist-pref-profile-name', '');
  const profile: ProfileMenuShared = {
    name: profileName,
    onNameChange: setProfileName,
    onExport: exportBackup,
    onImport: importFile,
    onRecurrenceOpen: () => setIsRecurrenceOpen(true),
    onCompletionLogOpen: () => setIsCompletionLogOpen(true),
    onSettingsOpen: () => setIsSettingsOpen(true),
  };

  // 할 일 카드의 메모 링크: 메모장 화면으로 이동해 그 메모를 고른다
  function handleOpenMemo(memoId: string) {
    setActiveId(memoId);
    navigate('memo');
  }

  return (
    <>
      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          duration={toast.duration}
          actionLabel={toast.actionLabel}
          onAction={toast.onAction}
          type={toast.type}
          onClose={() => { clearToast(); dismissUndo(); }}
        />
      )}
      <AppToolbar navCollapsed={navCollapsed} theme={theme} onToggleTheme={toggleTheme} profile={profile} />
      <div className={`app-shell${navCollapsed ? ' app-shell--nav-collapsed' : ''}`}>
      <AppNav current={view} collapsed={navCollapsed} onToggleCollapsed={() => setNavCollapsed(prev => !prev)} profile={profile} reportAttention={hasUnreportedLastWeek} />
      <div className="app-shell__content">
      <div className="todo-app">
      <StorageNotice
        saveFailed={storageStatus.failedKeys.length > 0}
        hasCorrupt={storageStatus.corruptKeys.length > 0}
        onExport={exportBackup}
        onRetry={() => { if (retryFailedWrites().length > 0) showToast({ message: '아직 저장하지 못했습니다. 내보내기로 파일을 보관해 두세요.', type: 'danger' }); else showToast({ message: '저장했습니다.', type: 'success' }); }}
        onDownloadCorrupt={() => downloadCorruptBackups(readCorruptBackups())}
        onDiscardCorrupt={discardCorruptBackups}
      />
      {reminder.show && (
        <BackupReminder message={reminder.message} onExport={exportBackup} onSnooze={snooze} />
      )}
      {/* 화면 칸: 푸터를 뺀 남는 높이를 가져가 짧은 화면에서도 푸터가 맨 아래에 붙게 한다 */}
      <div className="todo-app__view">
      {view === 'todos' ? (
        <TodoPage
          inputProps={{
            draft: todoDraft,
            onDraftChange: setTodoDraft,
            onAdd: addTodo,
            categories: categoryOptions,
            leaveTitlesOn: date => allTodos.filter(t => normalizeKind(t.kind) === 'leave' && t.dueDate === date).map(t => t.text),
          }}
          dueSummaryProps={{ dueTodayCount, overdueCount, onJump: (scope) => setDueScope(scope) }}
          filterBarProps={{
            filterStatus,
            setFilterStatus,
            filterCategory,
            setFilterCategory,
            sortKey,
            setSortKey,
            query,
            setQuery,
            dueScope,
            setDueScope,
            recurrenceOnly,
            setRecurrenceOnly,
            categories,
            activeCount,
            completedCount,
            onClearCompleted: clearCompleted,
            selectionMode,
            onToggleSelectionMode: handleToggleSelectionMode,
            hasTodos: filteredTodos.length > 0,
            hasSubtasks,
            allCollapsed,
            onCollapseAll: collapseAllSubtasks,
            onExpandAll: expandAllSubtasks,
          }}
          bulkBarProps={selectionMode ? {
            selectedCount: selectedIds.size,
            categories: categoryOptions,
            onSelectAll: handleSelectAll,
            onClearSelection: handleClearSelection,
            onApplyCategory: handleBulkCategory,
            onApplyPriority: handleBulkPriority,
            onDelete: handleBulkDelete,
            onClose: handleToggleSelectionMode,
          } : null}
          listProps={{
            todos: filteredTodos,
            filterStatus,
            sortKey,
            categories: categoryOptions,
            memos,
            onOpenMemo: handleOpenMemo,
            onToggle: toggleTodo,
            onDelete: deleteTodo,
            onUpdate: updateTodo,
            onPin: pinTodo,
            onCopy: handleCopyTodo,
            onShare: handleShareTodo,
            onKakaoShare: handleKakaoShareTodo,
            onDuplicate: handleDuplicateTodo,
            onAddSubtask: addSubtask,
            onToggleSubtask: toggleSubtask,
            onDeleteSubtask: deleteSubtask,
            onUpdateSubtask: updateSubtask,
            onReorderSubtasks: reorderSubtasks,
            onReorderTodos: reorderTodos,
            onToggleSubtasksCollapsed: toggleSubtasksCollapsed,
            selectionMode,
            selectedIds,
            onToggleSelect: handleToggleSelect,
          }}
        />
      ) : view === 'dashboard' ? (
        <DashboardPage todos={allTodos} completionLog={completionLog} />
      ) : view === 'calendar' ? (
        <CalendarPage todos={allTodos} series={recurrenceSeries} completionLog={completionLog} />
      ) : view === 'memo' ? (
        <MemoPage
          memos={memos}
          setMemos={setMemos}
          activeId={activeId}
          setActiveId={setActiveId}
          todos={allTodos}
          onLinkMemo={linkMemoToTodo}
          onUnlinkMemo={unlinkMemoFromTodo}
          onCopyText={runCopy}
          onShareText={runShare}
          onKakaoShareText={runKakaoShare}
        />
      ) : (
        <WeeklyReportPage todos={allTodos} completionLog={completionLog} onCopy={runCopy} drafts={weeklyReports.data.drafts} onSaveDraft={weeklyReports.saveDraft} onResetDraft={weeklyReports.resetDraft} onMarkCopied={weeklyReports.markCopied} hasUnreportedLastWeek={hasUnreportedLastWeek} />
      )}
      </div>

      {pendingImport && (
        <ConfirmModal
          message="이 파일의 데이터로 아래 구역을 교체합니다. 파일에 없는 구역은 그대로 둡니다."
          details={summarizeBackup(pendingImport)}
          confirmLabel="가져오기"
          confirmTone="main"
          extraAction={{ label: '현재 데이터 내보내기', onClick: exportBackup }}
          onConfirm={confirmImport}
          onCancel={cancelImport}
        />
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onResetTodos={handleResetTodos}
        onResetMemos={handleResetMemos}
        onResetAll={handleResetAll}
        onResetCompletionLog={handleResetCompletionLog}
        notifyEnabled={notifyEnabled}
        onToggleNotify={setNotifyEnabled}
        lastBackup={lastBackup}
      />

      <RecurrenceSeriesModal
        isOpen={isRecurrenceOpen}
        onClose={() => setIsRecurrenceOpen(false)}
        seriesList={recurrenceSeries}
        todos={allTodos}
        categories={categoryOptions}
        onAdd={addRecurrenceSeries}
        onUpdate={updateRecurrenceSeries}
        onEnd={endRecurrenceSeries}
        onResume={resumeRecurrenceSeries}
        onDelete={deleteRecurrenceSeries}
      />

      <CompletionLogModal
        isOpen={isCompletionLogOpen}
        onClose={() => setIsCompletionLogOpen(false)}
        entries={completionLog}
        onReset={handleResetCompletionLog}
        onDeleteEntry={handleDeleteLogEntry}
        onCopyEntry={handleCopyLogEntry}
        onShareEntry={handleShareLogEntry}
        onCopyAll={handleCopyAllLog}
        onShareAll={handleShareAllLog}
        onKakaoShareAll={handleKakaoShareAllLog}
      />

      <ScrollTopButton />

      <footer className="todo-app__footer">
        <p className="todo-app__footer-copy">
          &copy; 2026 parkchanwung. All Rights Reserved.
          <span className="todo-app__footer-legal">무단 복제 및 배포를 금지합니다.</span>
        </p>
      </footer>
    </div>
    </div>
    </div>
    </>
  );
}
