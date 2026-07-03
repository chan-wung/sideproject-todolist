import { useState, useEffect, useCallback } from 'react';
import { useTodos, validateTodos } from './hooks/useTodos';
import { useMemos, validateMemos } from './hooks/useMemos';
import type { Memo } from './hooks/useMemos';
import { useDueNotifications } from './hooks/useDueNotifications';
import { usePersistentState } from './hooks/usePersistentState';
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
import type { Todo } from './types/todo';
import { generateId } from './utils/id';
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
    categories,
    activeCount,
    completedCount,
    dueTodayCount,
    overdueCount,
    addTodo,
    toggleTodo,
    deleteTodo,
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

  interface ToastState {
    id: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
    duration?: number;
    type?: 'primary' | 'success' | 'danger';
  }

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
    return { version: 1, todos: exportData(), memos };
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

      if (validTodos) importData(validTodos);
      if (validMemos) replaceMemos(validMemos);
      
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

  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function handleToggleSelectionMode() {
    setSelectionMode(prev => !prev);
    setSelectedIds(new Set());
  }

  function handleToggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleSelectAll() {
    setSelectedIds(new Set(filteredTodos.map(t => t.id)));
  }

  function handleClearSelection() {
    setSelectedIds(new Set());
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
    setSelectedIds(new Set());
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
      <AppToolbar getBackup={getBackup} applyBackup={applyBackup} onImportResult={handleImportResult} onExport={handleExportResult} onSettingsOpen={() => setIsSettingsOpen(true)} />
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

        <TodoInput onAdd={addTodo} categories={categories.filter(c => c !== 'all')} />
          
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
          categories={categories}
          activeCount={activeCount}
          completedCount={completedCount}
          onClearCompleted={clearCompleted}
          selectionMode={selectionMode}
          onToggleSelectionMode={handleToggleSelectionMode}
          hasSubtasks={hasSubtasks}
          allCollapsed={allCollapsed}
          onCollapseAll={collapseAllSubtasks}
          onExpandAll={expandAllSubtasks}
        />
        {selectionMode && (
          <BulkActionBar
            selectedCount={selectedIds.size}
            categories={categories.filter(c => c !== 'all')}
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
          categories={categories.filter(c => c !== 'all')}
          memos={memos}
          onOpenMemo={handleOpenMemo}
          onToggle={toggleTodo}
          onDelete={deleteTodo}
          onUpdate={updateTodo}
          onPin={pinTodo}
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
        notifyEnabled={notifyEnabled}
        onToggleNotify={setNotifyEnabled}
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
