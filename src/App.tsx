import { useState, useEffect, useRef } from 'react';
import { useTodos } from './hooks/useTodos';
import { useMemos } from './hooks/useMemos';
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
import './styles/main.scss';

export default function App() {
  const {
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
    exportData,
    importData,
    resetTodos,
    undoMessage,
    performUndo,
    dismissUndo,
  } = useTodos();

  const { memos, setMemos, activeId, setActiveId, resetMemos, replaceMemos } = useMemos();

  useEffect(() => {
    pruneMemoLinks(memos.map(m => m.id));
  }, [memos, pruneMemoLinks]);

  interface ToastState {
    message: string;
    actionLabel?: string;
    onAction?: () => void;
    duration?: number;
    type?: 'primary' | 'success' | 'danger';
  }

  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    if (!undoMessage) return;
    setToast({
      message: undoMessage,
      actionLabel: '실행취소',
      onAction: performUndo,
      duration: 5000,
      type: 'danger',
    });
  }, [undoMessage, performUndo]);

  function getBackup() {
    return { version: 1, todos: exportData(), memos };
  }

  function applyBackup(parsed: unknown): boolean {
    if (Array.isArray(parsed)) {
      return importData(parsed);
    }
    if (parsed && typeof parsed === 'object') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const p = parsed as any;
      let ok = false;
      let todosSuccess = true;
      let memosSuccess = true;
      
      if (p.todos !== undefined) {
        todosSuccess = importData(p.todos);
        ok = true;
      }
      if (p.memos !== undefined) {
        memosSuccess = replaceMemos(p.memos);
        ok = true;
      }
      return ok && todosSuccess && memosSuccess;
    }
    return false;
  }

  function handleImportResult(success: boolean) {
    if (success) {
      setToast({ message: '데이터를 성공적으로 불러왔습니다.', type: 'primary' });
    } else {
      setToast({ message: '데이터 불러오기에 실패했습니다.', type: 'danger' });
    }
  }

  function handleExportResult() {
    setToast({ message: '데이터를 내보냈습니다.', type: 'success' });
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
    setToast({ message: '선택한 항목의 카테고리를 변경했습니다.' });
  }

  function handleBulkPriority(priority: Todo['priority']) {
    bulkUpdatePriority(Array.from(selectedIds), priority);
    setToast({ message: '선택한 항목의 우선순위를 변경했습니다.' });
  }

  function handleBulkDelete() {
    bulkDelete(Array.from(selectedIds));
    setSelectedIds(new Set());
  }

  function handleResetTodos() {
    resetTodos();
    setToast({ message: '할일을 초기화했습니다.', type: 'danger' });
  }

  function handleResetMemos() {
    resetMemos();
    setToast({ message: '메모를 초기화했습니다.', type: 'danger' });
  }

  function handleResetAll() {
    resetTodos();
    resetMemos();
    setToast({ message: '전체 데이터를 초기화했습니다.', type: 'danger' });
  }

  const [isMemoOpen, setIsMemoOpen] = useState(false);

  function handleOpenMemo(memoId: string) {
    setActiveId(memoId);
    setIsMemoOpen(true);
  }

  const [showScrollTop, setShowScrollTop] = useState(false);
  const inputSentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = inputSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowScrollTop(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-16px 0px 0px 0px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      {toast && (
        <Toast
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
        <div style={{ position: 'sticky', top: '24px', width: 0, height: 0, overflow: 'visible', zIndex: 10 }}>
          <QuickNav filteredTodos={filteredTodos} />
        </div>
        <div ref={inputSentinelRef} />
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
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onResetTodos={handleResetTodos}
        onResetMemos={handleResetMemos}
        onResetAll={handleResetAll}
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
