interface Props { dueTodayCount: number; overdueCount: number; onJump: (scope: 'today' | 'overdue') => void; }
export default function DueSummary({ dueTodayCount, overdueCount, onJump }: Props) {
  if (dueTodayCount === 0 && overdueCount === 0) return null;
  return (
    <div className="due-summary">
      {overdueCount > 0 && (
        <button type="button" className="due-summary__item due-summary__item--overdue" onClick={() => onJump('overdue')}>⚠ 지연 {overdueCount}</button>
      )}
      {dueTodayCount > 0 && (
        <button type="button" className="due-summary__item due-summary__item--today" onClick={() => onJump('today')}>오늘 마감 {dueTodayCount}</button>
      )}
    </div>
  );
}
