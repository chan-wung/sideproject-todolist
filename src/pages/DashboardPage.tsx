import { useMemo, useState } from 'react';
import type { Todo, CompletionLogEntry } from '../types/todo';
import { useDayChange } from '../hooks/useDayChange';
import { viewHref } from '../hooks/useView';
import { buildDashboardStats, type DashboardTodo } from '../utils/dashboard';
import { diffDays, formatMonthDayWeekday, formatReportDate, todayStr } from '../utils/date';

interface Props {
  todos: Todo[];
  completionLog: CompletionLogEntry[];
}

const OVERDUE_SHOWN = 5; // 밀린 일은 오래된 순으로 이만큼만 보여 주고 나머지는 개수로 줄인다

// '2026.11.2' → '11.2'
const monthDay = (dateStr: string) => formatReportDate(dateStr).slice(5);

function StatCard({ label, value, sub, tone }: { label: string; value: number; sub: string; tone?: 'danger' }) {
  return (
    <div className="dashboard__stat">
      <p className="dashboard__stat-label">{label}</p>
      <p className={`dashboard__stat-value${tone ? ` dashboard__stat-value--${tone}` : ''}`}>
        {value}<span className="dashboard__stat-unit">건</span>
      </p>
      <p className="dashboard__stat-sub">{sub}</p>
    </div>
  );
}

function TodoLine({ todo, note }: { todo: DashboardTodo; note: string }) {
  const showCategory = todo.category && todo.category !== '기본';
  return (
    <li className="dashboard__line">
      {showCategory && <span className="dashboard__cat">{todo.category}</span>}
      <span className="dashboard__line-txt">{todo.text}</span>
      <span className="dashboard__line-note">{note}</span>
    </li>
  );
}

// 지금 상황을 한눈에: 이번 주 완료 수, 밀린 일·마감, 보고에서 빠질 수 있는 정기 업무, 프로젝트별 작업량, 주간 추이, 연차.
export default function DashboardPage({ todos, completionLog }: Props) {
  const [today, setToday] = useState(todayStr);
  useDayChange(() => setToday(todayStr()));

  const stats = useMemo(
    () => buildDashboardStats({ todos, completionLog, today }),
    [todos, completionLog, today],
  );

  const diff = stats.completedThisWeek - stats.completedLastWeek;
  const compare = diff === 0
    ? `지난주와 같음 (${stats.completedLastWeek}건)`
    : `지난주 ${stats.completedLastWeek}건 (${diff > 0 ? '+' : ''}${diff})`;
  const maxCategory = Math.max(1, ...stats.byCategory.map(c => c.count));
  const maxTrend = Math.max(1, ...stats.trend.map(w => w.count));
  const overdueRest = stats.overdue.length - OVERDUE_SHOWN;

  return (
    <main className="dashboard">
      <div className="dashboard__wrap">
        <div className="dashboard__head">
          <h2 className="dashboard__tit">대시보드</h2>
          <p className="dashboard__week">
            {stats.weekStart.slice(0, 4)}년 {stats.weekLabel} ({monthDay(stats.weekStart)} ~ {monthDay(stats.weekEnd)})
          </p>
        </div>

        <div className="dashboard__stats">
          <StatCard label="이번 주 완료" value={stats.completedThisWeek} sub={compare} />
          <StatCard label="진행 중" value={stats.activeCount} sub="연차·휴가는 제외" />
          <StatCard
            label="밀린 일"
            value={stats.overdue.length}
            sub={stats.overdue.length > 0 ? '마감이 지난 미완료' : '밀린 일이 없습니다'}
            tone={stats.overdue.length > 0 ? 'danger' : undefined}
          />
          <StatCard label="오늘 마감" value={stats.dueToday} sub={`이번 주 남은 마감 ${stats.dueThisWeek}건`} />
        </div>

        <div className="dashboard__grid">
          <section className="dashboard__card dashboard__card--alert">
            <h3 className="dashboard__card-tit">이번 주 못 한 정기 업무</h3>
            {stats.pendingRoutines.length === 0 ? (
              <p className="dashboard__empty">이번 주 마감인 정기 업무를 모두 마쳤습니다.</p>
            ) : (
              <>
                <ul className="dashboard__list">
                  {stats.pendingRoutines.map(t => (
                    <TodoLine key={t.id} todo={t} note={`${monthDay(t.dueDate)} 마감`} />
                  ))}
                </ul>
                <p className="dashboard__hint">끝내지 않으면 주간보고에 날짜 줄로 들어가지 않습니다.</p>
              </>
            )}
          </section>

          <section className="dashboard__card">
            <h3 className="dashboard__card-tit">이번 주 프로젝트별 완료</h3>
            {stats.byCategory.length === 0 ? (
              <p className="dashboard__empty">이번 주 완료한 일이 없습니다.</p>
            ) : (
              <ul className="dashboard__list">
                {stats.byCategory.map(c => (
                  <li key={c.category} className="dashboard__bar-row">
                    <span className="dashboard__bar-name">{c.category}</span>
                    <span className="dashboard__bar-track" aria-hidden="true">
                      <span className="dashboard__bar-fill" style={{ width: `${(c.count / maxCategory) * 100}%` }} />
                    </span>
                    <span className="dashboard__bar-count">{c.count}건</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="dashboard__card">
            <h3 className="dashboard__card-tit">최근 {stats.trend.length}주 완료 수</h3>
            <ul className="dashboard__trend">
              {stats.trend.map((w, i) => (
                <li
                  key={w.weekStart}
                  className={`dashboard__trend-col${i === stats.trend.length - 1 ? ' dashboard__trend-col--now' : ''}`}
                >
                  <span className="dashboard__trend-count">{w.count}</span>
                  <span className="dashboard__trend-bar" aria-hidden="true">
                    <span className="dashboard__trend-fill" style={{ height: `${(w.count / maxTrend) * 100}%` }} />
                  </span>
                  <span className="dashboard__trend-label">{w.label}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="dashboard__card">
            <h3 className="dashboard__card-tit">밀린 일</h3>
            {stats.overdue.length === 0 ? (
              <p className="dashboard__empty">마감이 지난 미완료 일이 없습니다.</p>
            ) : (
              <>
                <ul className="dashboard__list">
                  {stats.overdue.slice(0, OVERDUE_SHOWN).map(t => (
                    <TodoLine key={t.id} todo={t} note={`${diffDays(t.dueDate, today)}일 지남`} />
                  ))}
                </ul>
                {overdueRest > 0 && (
                  <p className="dashboard__hint">
                    외 {overdueRest}건 · <a className="dashboard__link" href={viewHref('todos')}>할 일에서 보기</a>
                  </p>
                )}
              </>
            )}
          </section>

          <section className="dashboard__card">
            <h3 className="dashboard__card-tit">이번 주 연차·휴가</h3>
            {stats.leaveThisWeek.length === 0 ? (
              <p className="dashboard__empty">이번 주 연차·휴가 일정이 없습니다.</p>
            ) : (
              <ul className="dashboard__list">
                {stats.leaveThisWeek.map(l => (
                  <li key={`${l.date}|${l.text}`} className="dashboard__line">
                    <span className="dashboard__cat">{formatMonthDayWeekday(l.date)}</span>
                    <span className="dashboard__line-txt">{l.text}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="dashboard__hint">
              <a className="dashboard__link" href={viewHref('calendar')}>캘린더에서 등록</a>
              {' · '}
              <a className="dashboard__link" href={viewHref('report')}>주간보고 보기</a>
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
