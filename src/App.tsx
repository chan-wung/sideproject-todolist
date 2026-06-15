import { useState } from 'react';
import { useTodos } from './hooks/useTodos';
import TodoInput from './components/TodoInput';
import FilterBar from './components/FilterBar';
import TodoList from './components/TodoList';
import DueSummary from './components/DueSummary';
import AppToolbar from './components/AppToolbar';
import Toast from './components/Toast';
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

  return (
    <div className="todo-app">
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}
      <AppToolbar exportData={exportData} importData={importData} onImportResult={handleImportResult} />
      <header className="todo-app__header">
        <h1 className="todo-app__tit">Todo List</h1>
        <p className="todo-app__subtitle">할 일을 체계적으로 관리하세요</p>
      </header>

      <main className="todo-app__body">
        <TodoInput onAdd={addTodo} />
        
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
          onToggle={toggleTodo}
          onDelete={deleteTodo}
          onUpdate={updateTodo}
          onAddSubtask={addSubtask}
          onToggleSubtask={toggleSubtask}
          onDeleteSubtask={deleteSubtask}
        />
      </main>
    </div>
  );
}
