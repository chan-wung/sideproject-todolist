import type { FilterStatus, SortKey, DueScope } from '../types/todo';

interface Props {
  filterStatus: FilterStatus;
  setFilterStatus: (v: FilterStatus) => void;
  filterCategory: string;
  setFilterCategory: (v: string) => void;
  sortKey: SortKey;
  setSortKey: (v: SortKey) => void;
  query: string;
  setQuery: (v: string) => void;
  dueScope: DueScope;
  setDueScope: (v: DueScope) => void;
  categories: string[];
  activeCount: number;
  completedCount: number;
  onClearCompleted: () => void;
}

const STATUS_TABS: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'active', label: '진행 중' },
  { value: 'completed', label: '완료' },
];

const SORT_BTNS: { value: SortKey; label: string }[] = [
  { value: 'default', label: '최신순' },
  { value: 'priority', label: '우선순위' },
  { value: 'dueDate', label: '마감일순' },
];

const DUE_BTNS: { value: DueScope; label: string }[] = [
  { value: 'all', label: '마감일 전체' },
  { value: 'today', label: '오늘 마감' },
  { value: 'week', label: '이번주 마감' },
  { value: 'overdue', label: '지연' },
];

export default function FilterBar({
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
  onClearCompleted,
}: Props) {
  return (
    <div className="filter-bar">
      <input className="filter-bar__search" type="search" placeholder="검색 (제목·카테고리)"
        value={query} onChange={e => setQuery(e.target.value)} />
      
      <div className="filter-bar__tabs">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            className={`filter-bar__tab${filterStatus === tab.value ? ' filter-bar__tab--active' : ''}`}
            onClick={() => setFilterStatus(tab.value)}
            type="button"
          >
            {tab.label}
            {tab.value === 'active' && activeCount > 0 && (
              <span className="filter-bar__count">{activeCount}</span>
            )}
          </button>
        ))}
      </div>

      <div className="filter-bar__right">
        <div className="filter-bar__sort">
          {DUE_BTNS.map(btn => (
            <button
              key={btn.value}
              className={`filter-bar__sort-btn${dueScope === btn.value ? ' filter-bar__sort-btn--active' : ''}`}
              type="button"
              onClick={() => setDueScope(btn.value)}
            >
              {btn.label}
            </button>
          ))}
        </div>
        <div className="filter-bar__sort">
          {SORT_BTNS.map(btn => (
            <button
              key={btn.value}
              className={`filter-bar__sort-btn${sortKey === btn.value ? ' filter-bar__sort-btn--active' : ''}`}
              type="button"
              onClick={() => setSortKey(btn.value)}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {categories.length > 1 && (
          <select
            className="filter-bar__category"
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
          >
            <option value="all">전체 카테고리</option>
            {categories.filter(c => c !== 'all').map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        )}

        {completedCount > 0 && (
          <button
            className="filter-bar__clear-btn"
            type="button"
            onClick={onClearCompleted}
          >
            완료 항목 삭제 ({completedCount})
          </button>
        )}
      </div>
    </div>
  );
}
