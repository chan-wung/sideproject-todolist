import type { ComponentProps } from 'react';
import TodoInput from '../components/TodoInput';
import FilterBar from '../components/FilterBar';
import TodoList from '../components/TodoList';
import DueSummary from '../components/DueSummary';
import QuickNav from '../components/QuickNav';
import BulkActionBar from '../components/BulkActionBar';

// 할 일 화면 조립만 담당한다. 상태와 핸들러는 App이 만들어 내려준다.
// (같은 데이터를 주간보고·캘린더·대시보드 화면도 쓰게 되므로 상태는 App에 둔다.)
interface Props {
  inputProps: ComponentProps<typeof TodoInput>;
  dueSummaryProps: ComponentProps<typeof DueSummary>;
  filterBarProps: ComponentProps<typeof FilterBar>;
  /** 선택 모드일 때만 값을 넘긴다. */
  bulkBarProps: ComponentProps<typeof BulkActionBar> | null;
  listProps: ComponentProps<typeof TodoList>;
}

export default function TodoPage({ inputProps, dueSummaryProps, filterBarProps, bulkBarProps, listProps }: Props) {
  return (
    <main className="todo-app__body">
      <h1 className="todo-app__tit">할 일</h1>

      <QuickNav filteredTodos={listProps.todos} />

      <TodoInput {...inputProps} />

      <DueSummary {...dueSummaryProps} />

      <FilterBar {...filterBarProps} />
      {bulkBarProps && <BulkActionBar {...bulkBarProps} />}
      <TodoList {...listProps} />
    </main>
  );
}
