import { useState, useEffect } from 'react';
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
import TodoPage from './pages/TodoPage';
import WeeklyReportPage from './pages/WeeklyReportPage';
import CalendarPage from './pages/CalendarPage';
import DashboardPage from './pages/DashboardPage';
import AppNav from './components/AppNav';
import BackupReminder from './components/BackupReminder';
import Toast from './components/Toast';
import ScrollTopButton from './components/ScrollTopButton';
import MemoPage from './pages/MemoPage';
import AppToolbar from './components/AppToolbar';
import SettingsModal from './components/SettingsModal';
import CompletionLogModal from './components/CompletionLogModal';
import RecurrenceSeriesModal from './components/RecurrenceSeriesModal';
import type { Todo, CompletionLogEntry } from './types/todo';
import { normalizeKind } from './utils/kind';
import { buildWeeklyReport, shiftWeek } from './utils/weeklyReport';
import { startOfWeek, todayStr } from './utils/date';
import { downloadBackup } from './utils/backup';
import { parseBackup } from './utils/backupData';
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

  useEffect(() => {
    if (memos.length === 0) return;
    pruneMemoLinks(memos.map(m => m.id));
  }, [memos, pruneMemoLinks]);

  const [notifyEnabled, setNotifyEnabled] = usePersistentState<boolean>('todolist-pref-notify', false);
  useDueNotifications(allTodos, notifyEnabled);

  const view = useView();
  // 화면(메뉴)을 옮기면 이전 화면의 스크롤 위치를 가져가지 않고 맨 위부터 보여 준다
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); // html에 smooth가 걸려 있어 즉시 이동을 지정
  }, [view]);

  const hasData = allTodos.length > 0 || memos.length > 0 || completionLog.length > 0 || recurrenceSeries.length > 0 || Object.keys(weeklyReports.data.drafts).length > 0;
  const { lastBackup, reminder, markBackedUp, snooze } = useBackupReminder(hasData);
  const [navCollapsed, setNavCollapsed] = usePersistentState<boolean>('todolist-pref-nav-collapsed', false);

  const { toast, showToast, clearToast } = useToast();
  const { runCopy, runShare, runKakaoShare } = useShareActions(showToast);

  useEffect(() => {
    if (!undoMessage) return;
    showToast({
      message: undoMessage,
      actionLabel: '실행취소',
      onAction: performUndo,
      duration: 5000,
      type: 'danger',
    });
  }, [undoMessage, performUndo, showToast]);

  function getBackup() {
    return { version: 1, todos: exportData(), memos, completionLog: exportCompletionLog(), recurrenceSeries: exportRecurrenceSeries(), weeklyReports: weeklyReports.data };
  }

  // 백업 파일을 검증(parseBackup)한 뒤, 파일에 있던 구역만 덮어쓴다. 검증에 실패하면 아무것도 바꾸지 않는다.
  function applyBackup(parsed: unknown): boolean {
    const backup = parseBackup(parsed);
    if (!backup) return false;
    if (backup.todos) importData(backup.todos);
    if (backup.memos) replaceMemos(backup.memos);
    if (backup.completionLog) importCompletionLog(backup.completionLog);
    if (backup.recurrenceSeries) importRecurrenceSeries(backup.recurrenceSeries);
    if (backup.weeklyReports) weeklyReports.importData(backup.weeklyReports);
    return true;
  }

  function handleImportResult(success: boolean) {
    if (success) {
      showToast({ message: '데이터를 성공적으로 불러왔습니다.', type: 'primary' });
    } else {
      showToast({ message: '데이터 불러오기에 실패했습니다.', type: 'danger' });
    }
  }

  function handleExportResult() {
    markBackedUp();
    showToast({ message: '데이터를 내보냈습니다.', type: 'success' });
  }

  // 알림 배너의 '지금 내보내기': 툴바의 내보내기와 같은 파일을 내려받는다
  function handleExportFromReminder() {
    downloadBackup(getBackup());
    handleExportResult();
  }

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const {
    selectionMode,
    selectedIds,
    toggleMode: handleToggleSelectionMode,
    toggle: handleToggleSelect,
    selectAll,
    clear: handleClearSelection,
  } = useSelection();

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
    showToast({ message: '할일을 초기화했습니다.', type: 'danger' });
  }

  function handleResetMemos() {
    resetMemos();
    showToast({ message: '메모를 초기화했습니다.', type: 'danger' });
  }

  function handleResetAll() {
    resetTodos();
    resetMemos();
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
      <AppToolbar navCollapsed={navCollapsed} getBackup={getBackup} applyBackup={applyBackup} onImportResult={handleImportResult} onExport={handleExportResult} onSettingsOpen={() => setIsSettingsOpen(true)} onCompletionLogOpen={() => setIsCompletionLogOpen(true)} onRecurrenceOpen={() => setIsRecurrenceOpen(true)} />
      <div className={`app-shell${navCollapsed ? ' app-shell--nav-collapsed' : ''}`}>
      <AppNav current={view} collapsed={navCollapsed} onToggleCollapsed={() => setNavCollapsed(prev => !prev)} reportAttention={!buildWeeklyReport({ weekStart: shiftWeek(startOfWeek(todayStr()), -1), todos: allTodos, completionLog }).isEmpty && !weeklyReports.data.copiedWeeks.includes(shiftWeek(startOfWeek(todayStr()), -1))} />
      <div className="app-shell__content">
      <div className="todo-app">
      {reminder.show && (
        <BackupReminder message={reminder.message} onExport={handleExportFromReminder} onSnooze={snooze} />
      )}
      {/* 화면 칸: 푸터를 뺀 남는 높이를 가져가 짧은 화면에서도 푸터가 맨 아래에 붙게 한다 */}
      <div className="todo-app__view">
      {view === 'todos' ? (
        <TodoPage
          inputProps={{
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
        <WeeklyReportPage todos={allTodos} completionLog={completionLog} onCopy={runCopy} drafts={weeklyReports.data.drafts} onSaveDraft={weeklyReports.saveDraft} onResetDraft={weeklyReports.resetDraft} onMarkCopied={weeklyReports.markCopied} hasUnreportedLastWeek={!buildWeeklyReport({ weekStart: shiftWeek(startOfWeek(todayStr()), -1), todos: allTodos, completionLog }).isEmpty && !weeklyReports.data.copiedWeeks.includes(shiftWeek(startOfWeek(todayStr()), -1))} />
      )}
      </div>

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
