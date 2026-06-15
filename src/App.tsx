import { useState } from 'react';
import { useTodos } from './hooks/useTodos';
import TodoInput from './components/TodoInput';
import FilterBar from './components/FilterBar';
import TodoList from './components/TodoList';
import DueSummary from './components/DueSummary';
import Toast from './components/Toast';
import QuickMemo from './components/QuickMemo';
import Sidebar from './components/Sidebar';
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
            className="todo-app__memo-btn" 
            onClick={() => setIsMemoOpen(true)}
            aria-label="빠른 메모장 열기"
          >
            📝 메모장
          </button>
          <button 
            className="todo-app__hamburger" 
            onClick={() => setIsSidebarOpen(true)}
            aria-label="메뉴 열기"
          >
            ☰
          </button>
        </div>
      </header>

      <main className="todo-app__body">
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
    </div>
  );
}
