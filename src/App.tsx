import { useState, useEffect, useRef } from 'react';
import { useTodos } from './hooks/useTodos';
import TodoInput from './components/TodoInput';
import FilterBar from './components/FilterBar';
import TodoList from './components/TodoList';
import DueSummary from './components/DueSummary';
import Toast from './components/Toast';
import QuickMemo from './components/QuickMemo';
import Sidebar from './components/Sidebar';
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
    exportData,
    importData,
  } = useTodos();

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  function handleImportResult(success: boolean) {
    if (success) {
      setToastMessage('데이터를 성공적으로 불러왔습니다.');
    } else {
      setToastMessage('데이터 불러오기에 실패했습니다.');
    }
  }

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
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
    <div className="todo-app">
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
      
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
          <button
            type="button"
            className="todo-app__hamburger"
            onClick={() => setIsSidebarOpen(true)}
            aria-label="메뉴 열기"
          >
            ☰
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
        />
      </main>
      
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        exportData={exportData} 
        importData={importData} 
        onImportResult={handleImportResult} 
      />
      
      <QuickMemo
        isOpen={isMemoOpen}
        onClose={() => setIsMemoOpen(false)}
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
  );
}
