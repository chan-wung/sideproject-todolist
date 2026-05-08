import { useTodos } from './hooks/useTodos';
import TodoInput from './components/TodoInput';
import FilterBar from './components/FilterBar';
import TodoList from './components/TodoList';
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
    categories,
    activeCount,
    completedCount,
    addTodo,
    toggleTodo,
    deleteTodo,
    updateTodo,
    clearCompleted,
  } = useTodos();

  return (
    <div className="todo-app">
      <header className="todo-app__header">
        <h1 className="todo-app__tit">Todo List</h1>
        <p className="todo-app__subtitle">할 일을 체계적으로 관리하세요</p>
      </header>

      <main className="todo-app__body">
        <TodoInput onAdd={addTodo} />
        <FilterBar
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterCategory={filterCategory}
          setFilterCategory={setFilterCategory}
          sortKey={sortKey}
          setSortKey={setSortKey}
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
        />
      </main>
    </div>
  );
}
