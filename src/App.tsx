import { useState, useEffect, useCallback } from 'react';
import { useTodos, validateTodos, validateCompletionLog, validateRecurrenceSeries } from './hooks/useTodos';
import { useMemos, validateMemos } from './hooks/useMemos';
import type { Memo } from './hooks/useMemos';
import { useDueNotifications } from './hooks/useDueNotifications';
import { usePersistentState } from './hooks/usePersistentState';
import { useSelection } from './hooks/useSelection';
import TodoInput from './components/TodoInput';
import FilterBar from './components/FilterBar';
import TodoList from './components/TodoList';
import DueSummary from './components/DueSummary';
import Toast from './components/Toast';
import QuickMemo from './components/QuickMemo';
import AppToolbar from './components/AppToolbar';
import SettingsModal from './components/SettingsModal';
import QuickNav from './components/QuickNav';
import BulkActionBar from './components/BulkActionBar';
import CompletionLogModal from './components/CompletionLogModal';
import RecurrenceSeriesModal from './components/RecurrenceSeriesModal';
import type { Todo, CompletionLogEntry, RecurrenceSeries } from './types/todo';
import { generateId } from './utils/id';
import {
  todoToText, copyText, shareText, completionLogEntryToText, completionLogEntriesToText,
  copyFeedback, shareFeedback, kakaoFeedback,
} from './utils/share';
import { preloadKakao, shareToKakao } from './utils/kakao';
import './styles/main.scss';

interface ToastState {
  id: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  duration?: number;
  type?: 'primary' | 'success' | 'danger';
}

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

  useEffect(() => {
    if (memos.length === 0) return;
    pruneMemoLinks(memos.map(m => m.id));
  }, [memos, pruneMemoLinks]);

  const [notifyEnabled, setNotifyEnabled] = usePersistentState<boolean>('todolist-pref-notify', false);
  useDueNotifications(allTodos, notifyEnabled);

  useEffect(() => {
    preloadKakao();
  }, []);

  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast = useCallback((state: Omit<ToastState, 'id'>) => {
    setToast({ ...state, id: generateId() });
  }, []);

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
    return { version: 1, todos: exportData(), memos, completionLog: exportCompletionLog(), recurrenceSeries: exportRecurrenceSeries() };
  }

  function applyBackup(parsed: unknown): boolean {
    if (Array.isArray(parsed)) {
      const validTodos = validateTodos(parsed);
      if (validTodos) {
        importData(validTodos);
        return true;
      }
      return false;
    }
    if (parsed && typeof parsed === 'object') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = parsed as any;
      let ok = false;
      let validTodos: Todo[] | null = null;
      let validMemos: Memo[] | null = null;
      let validLog: CompletionLogEntry[] | null = null;
      let validSeries: RecurrenceSeries[] | null = null;

      if (p.todos !== undefined) {
        validTodos = validateTodos(p.todos);
        if (!validTodos) return false;
        ok = true;
      }
      if (p.memos !== undefined) {
        validMemos = validateMemos(p.memos);
        if (!validMemos) return false;
        ok = true;
      }
      if (p.completionLog !== undefined) {
        validLog = validateCompletionLog(p.completionLog);
        if (!validLog) return false;
        ok = true;
      }
      if (p.recurrenceSeries !== undefined) {
        validSeries = validateRecurrenceSeries(p.recurrenceSeries);
        if (!validSeries) return false;
        ok = true;
      }

      if (validTodos) importData(validTodos);
      if (validMemos) replaceMemos(validMemos);
      if (validLog) importCompletionLog(validLog);
      if (validSeries) importRecurrenceSeries(validSeries);

      return ok;
    }
    return false;
  }

  function handleImportResult(success: boolean) {
    if (success) {
      showToast({ message: '데이터를 성공적으로 불러왔습니다.', type: 'primary' });
    } else {
      showToast({ message: '데이터 불러오기에 실패했습니다.', type: 'danger' });
    }
  }

  function handleExportResult() {
    showToast({ message: '데이터를 내보냈습니다.', type: 'success' });
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
    showToast({ message: '선택한 항목의 카테고리를 변경했습니다.' });
  }

  function handleBulkPriority(priority: Todo['priority']) {
    bulkUpdatePriority(Array.from(selectedIds), priority);
    showToast({ message: '선택한 항목의 우선순위를 변경했습니다.' });
  }

  function handleBulkDelete() {
    bulkDelete(Array.from(selectedIds));
    handleClearSelection();
  }

  // 복사·공유·카카오 공유를 실행하고 결과에 맞는 토스트를 띄운다.
  async function runCopy(text: string, successMessage: string) {
    showToast(copyFeedback(await copyText(text), successMessage));
  }

  async function runShare(title: string, text: string) {
    const feedback = shareFeedback(await shareText(title, text));
    if (feedback) showToast(feedback);
  }

  async function runKakaoShare(text: string) {
    const feedback = kakaoFeedback(await shareToKakao(text));
    if (feedback) showToast(feedback);
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
    showToast({ message: '전체 데이터를 초기화했습니다.', type: 'danger' });
  }

  function handleResetCompletionLog() {
    resetCompletionLog();
    showToast({ message: '완료 이력을 초기화했습니다.', type: 'danger' });
  }

  const LOG_COPIED_MESSAGE = '완료 이력을 클립보드에 복사했습니다.';
  const handleCopyLogEntry = (entry: CompletionLogEntry) => runCopy(completionLogEntryToText(entry), LOG_COPIED_MESSAGE);
  const handleShareLogEntry = (entry: CompletionLogEntry) => runShare('완료 이력 공유', completionLogEntryToText(entry));
  const handleCopyAllLog = (entries: CompletionLogEntry[]) => runCopy(completionLogEntriesToText(entries), LOG_COPIED_MESSAGE);
  const handleShareAllLog = (entries: CompletionLogEntry[]) => runShare('완료 이력 공유', completionLogEntriesToText(entries));
  const handleKakaoShareAllLog = (entries: CompletionLogEntry[]) => runKakaoShare(completionLogEntriesToText(entries));

  const [isCompletionLogOpen, setIsCompletionLogOpen] = useState(false);

  const [isRecurrenceOpen, setIsRecurrenceOpen] = useState(false);

  const [isMemoOpen, setIsMemoOpen] = useState(false);

  function handleOpenMemo(memoId: string) {
    setActiveId(memoId);
    setIsMemoOpen(true);
  }

  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 0);
    };
    window.addEventListener('scroll', handleScroll);
    // 초기 로드 시에도 한 번 체크
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
          onClose={() => { setToast(null); dismissUndo(); }}
        />
      )}
      <AppToolbar getBackup={getBackup} applyBackup={applyBackup} onImportResult={handleImportResult} onExport={handleExportResult} onSettingsOpen={() => setIsSettingsOpen(true)} onCompletionLogOpen={() => setIsCompletionLogOpen(true)} onRecurrenceOpen={() => setIsRecurrenceOpen(true)} />
      <div className="todo-app">
      <header className="todo-app__header">
        <div className="todo-app__header-left">
          <h1 className="todo-app__tit">Todo List</h1>
          <p className="todo-app__subtitle">할 일을 체계적으로 관리하세요</p>
        </div>
        <div className="todo-app__header-actions">
          <button
            type="button"
            className="todo-app__memo-btn"
            onClick={() => setIsMemoOpen(true)}
            aria-label="빠른 메모장 열기"
          >
            📝 메모장
          </button>
        </div>
      </header>

      <main className="todo-app__body">
        <div className="todo-app__quick-nav-wrap">
          <QuickNav filteredTodos={filteredTodos} />
        </div>

        <TodoInput onAdd={addTodo} categories={categoryOptions} />
          
        <DueSummary 
          dueTodayCount={dueTodayCount} 
          overdueCount={overdueCount} 
          onJump={(scope) => setDueScope(scope)} 
        />

        <FilterBar
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterCategory={filterCategory}
          setFilterCategory={setFilterCategory}
          sortKey={sortKey}
          setSortKey={setSortKey}
          query={query}
          setQuery={setQuery}
          dueScope={dueScope}
          setDueScope={setDueScope}
          recurrenceOnly={recurrenceOnly}
          setRecurrenceOnly={setRecurrenceOnly}
          categories={categories}
          activeCount={activeCount}
          completedCount={completedCount}
          onClearCompleted={clearCompleted}
          selectionMode={selectionMode}
          onToggleSelectionMode={handleToggleSelectionMode}
          hasTodos={filteredTodos.length > 0}
          hasSubtasks={hasSubtasks}
          allCollapsed={allCollapsed}
          onCollapseAll={collapseAllSubtasks}
          onExpandAll={expandAllSubtasks}
        />
        {selectionMode && (
          <BulkActionBar
            selectedCount={selectedIds.size}
            categories={categoryOptions}
            onSelectAll={handleSelectAll}
            onClearSelection={handleClearSelection}
            onApplyCategory={handleBulkCategory}
            onApplyPriority={handleBulkPriority}
            onDelete={handleBulkDelete}
            onClose={handleToggleSelectionMode}
          />
        )}
        <TodoList
          todos={filteredTodos}
          filterStatus={filterStatus}
          sortKey={sortKey}
          categories={categoryOptions}
          memos={memos}
          onOpenMemo={handleOpenMemo}
          onToggle={toggleTodo}
          onDelete={deleteTodo}
          onUpdate={updateTodo}
          onPin={pinTodo}
          onCopy={handleCopyTodo}
          onShare={handleShareTodo}
          onKakaoShare={handleKakaoShareTodo}
          onDuplicate={handleDuplicateTodo}
          onAddSubtask={addSubtask}
          onToggleSubtask={toggleSubtask}
          onDeleteSubtask={deleteSubtask}
          onUpdateSubtask={updateSubtask}
          onReorderSubtasks={reorderSubtasks}
          onReorderTodos={reorderTodos}
          onToggleSubtasksCollapsed={toggleSubtasksCollapsed}
          selectionMode={selectionMode}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
        />
      </main>
      
      <QuickMemo
        isOpen={isMemoOpen}
        onClose={() => setIsMemoOpen(false)}
        memos={memos}
        setMemos={setMemos}
        activeId={activeId}
        setActiveId={setActiveId}
        todos={allTodos}
        onLinkMemo={linkMemoToTodo}
        onUnlinkMemo={unlinkMemoFromTodo}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onResetTodos={handleResetTodos}
        onResetMemos={handleResetMemos}
        onResetAll={handleResetAll}
        onResetCompletionLog={handleResetCompletionLog}
        notifyEnabled={notifyEnabled}
        onToggleNotify={setNotifyEnabled}
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
        onCopyEntry={handleCopyLogEntry}
        onShareEntry={handleShareLogEntry}
        onCopyAll={handleCopyAllLog}
        onShareAll={handleShareAllLog}
        onKakaoShareAll={handleKakaoShareAllLog}
      />

      {showScrollTop && (
        <button
          type="button"
          className="scroll-top-btn"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="맨 위로"
        >
          ↑
        </button>
      )}

      <footer className="todo-app__footer">
        <p className="todo-app__footer-copy">
          &copy; 2026 parkchanwung. All Rights Reserved.
          <span className="todo-app__footer-legal">무단 복제 및 배포를 금지합니다.</span>
        </p>
      </footer>
    </div>
    </>
  );
}
