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
    clearCompleted,
    addSubtask,
    toggleSubtask,
    deleteSubtask,
    updateSubtask,
    reorderSubtasks,
    exportData,
    importData,
    resetTodos,
  } = useTodos();

  const { memos, setMemos, activeId, setActiveId, resetMemos, replaceMemos } = useMemos();

  const [toastMessage, setToastMessage] = useState<string | null>(null);

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
      setToastMessage('데이터를 성공적으로 불러왔습니다.');
    } else {
      setToastMessage('데이터 불러오기에 실패했습니다.');
    }
  }

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  function handleResetTodos() {
    resetTodos();
    setToastMessage('할일을 초기화했습니다.');
  }

  function handleResetMemos() {
    resetMemos();
    setToastMessage('메모를 초기화했습니다.');
  }

  function handleResetAll() {
    resetTodos();
    resetMemos();
    setToastMessage('전체 데이터를 초기화했습니다.');
  }

  const [isMemoOpen, setIsMemoOpen] = useState(false);
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
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
      <AppToolbar getBackup={getBackup} applyBackup={applyBackup} onImportResult={handleImportResult} onSettingsOpen={() => setIsSettingsOpen(true)} />
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
        />
        <TodoList
          todos={filteredTodos}
          filterStatus={filterStatus}
          categories={categories.filter(c => c !== 'all')}
          onToggle={toggleTodo}
          onDelete={deleteTodo}
          onUpdate={updateTodo}
          onPin={pinTodo}
          onAddSubtask={addSubtask}
          onToggleSubtask={toggleSubtask}
          onDeleteSubtask={deleteSubtask}
          onUpdateSubtask={updateSubtask}
          onReorderSubtasks={reorderSubtasks}
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
