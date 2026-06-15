import type { Todo, DueScope, SortKey, FilterStatus } from '../types/todo';

interface Props {
  allTodos: Todo[];
  onJumpCategory: (cat: string) => void;
  onJumpPinned: () => void;
  setDueScope: (s: DueScope) => void;
  setSortKey: (k: SortKey) => void;
  setFilterStatus: (s: FilterStatus) => void;
  dueTodayCount: number;
  overdueCount: number;
}

export default function QuickNav({
  allTodos,
  onJumpCategory,
  onJumpPinned,
  setDueScope,
  setSortKey,
  setFilterStatus,
  dueTodayCount,
  overdueCount,
}: Props) {
  const pinnedActive = allTodos.filter(t => t.pinned && !t.completed);
  const catCounts = Object.fromEntries(
    [...new Set(allTodos.map(t => t.category))].map(cat => [
      cat,
      allTodos.filter(t => t.category === cat && !t.completed).length,
    ])
  );
  const priorityCounts = { high: 0, medium: 0, low: 0 };
  allTodos.filter(t => !t.completed).forEach(t => {
    if (t.priority in priorityCounts) {
      priorityCounts[t.priority]++;
    }
  });

  return (
    <nav className="quick-nav">
      {/* 고정 항목 */}
      <div className="quick-nav__section">
        <h3 className="quick-nav__section-tit">고정 할 일</h3>
        <ul className="quick-nav__list">
          {pinnedActive.length > 0 ? (
            pinnedActive.map(t => (
              <li key={t.id} className="quick-nav__item" onClick={onJumpPinned}>
                {t.text.length > 15 ? t.text.slice(0, 15) + '…' : t.text}
              </li>
            ))
          ) : (
            <li className="quick-nav__item quick-nav__item--empty">없음</li>
          )}
        </ul>
      </div>

      {/* 마감 */}
      <div className="quick-nav__section">
        <h3 className="quick-nav__section-tit">마감</h3>
        <ul className="quick-nav__list">
          <li className="quick-nav__item" onClick={() => setDueScope('today')}>
            오늘 마감
            {dueTodayCount > 0 && <span className="quick-nav__count">{dueTodayCount}</span>}
          </li>
          <li className="quick-nav__item" onClick={() => setDueScope('overdue')}>
            지연
            {overdueCount > 0 && <span className="quick-nav__count quick-nav__count--red">{overdueCount}</span>}
          </li>
        </ul>
      </div>

      {/* 카테고리 */}
      <div className="quick-nav__section">
        <h3 className="quick-nav__section-tit">카테고리</h3>
        <ul className="quick-nav__list">
          {Object.entries(catCounts).map(([cat, count]) => (
            <li key={cat} className="quick-nav__item" onClick={() => onJumpCategory(cat)}>
              {cat}
              {count > 0 && <span className="quick-nav__count">{count}</span>}
            </li>
          ))}
        </ul>
      </div>

      {/* 우선순위 */}
      <div className="quick-nav__section">
        <h3 className="quick-nav__section-tit">우선순위</h3>
        <ul className="quick-nav__list">
          <li className="quick-nav__item" onClick={() => { setSortKey('priority'); setFilterStatus('active'); }}>
            높음
            {priorityCounts.high > 0 && <span className="quick-nav__count">{priorityCounts.high}</span>}
          </li>
          <li className="quick-nav__item" onClick={() => { setSortKey('priority'); setFilterStatus('active'); }}>
            보통
            {priorityCounts.medium > 0 && <span className="quick-nav__count">{priorityCounts.medium}</span>}
          </li>
          <li className="quick-nav__item" onClick={() => { setSortKey('priority'); setFilterStatus('active'); }}>
            낮음
            {priorityCounts.low > 0 && <span className="quick-nav__count">{priorityCounts.low}</span>}
          </li>
        </ul>
      </div>
    </nav>
  );
}
