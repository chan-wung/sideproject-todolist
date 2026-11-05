import { useMemo, useState } from 'react';
import type { Todo, RecurrenceSeries, CompletionLogEntry } from '../types/todo';
import { KIND_LABEL } from '../constants/labels';
import { useCalendarMonth, WEEKDAYS } from '../hooks/useCalendarMonth';
import { useDayChange } from '../hooks/useDayChange';
import { buildCalendarItems, formatPeriod, itemsOnDate, layoutMonth, monthRange, type CalendarItem } from '../utils/calendar';
import { formatMonthDayWeekday, todayStr } from '../utils/date';
import { viewHref } from '../hooks/useView';
import PeriodNav from '../components/PeriodNav';
import PageHead from '../components/PageHead';

interface Props {
  todos: Todo[];
  series: RecurrenceSeries[];
  /** '완료 정리'로 목록에서 빠진 항목. 캘린더에는 원래 기간에 계속 보인다 */
  completionLog: CompletionLogEntry[];
}

const MAX_LANES = 3; // 한 주에 띠로 보여 주는 최대 줄 수. 넘으면 날짜 칸에 '+N'

function itemClass(item: CalendarItem, block: string): string {
  return [
    block,
    `${block}--${item.kind}`,
    item.upcoming ? `${block}--upcoming` : '',
    item.completed ? `${block}--done` : '',
  ].filter(Boolean).join(' ');
}

// 월간 달력(보기 전용): 모든 할 일(완료·완료 정리된 것 포함), 연차, 정기 업무, 반복 일정의 앞날 예정을 보여 준다.
// 기간이 있는 항목은 시작일부터 마감일까지 이어진 띠로 그린다.
export default function CalendarPage({ todos, series, completionLog }: Props) {
  const [today, setToday] = useState(todayStr);
  const { year, month, label, goPrev, goNext, goTo } = useCalendarMonth(todayStr());
  const [selected, setSelected] = useState<string | null>(today);

  // 자정이 지나거나 탭으로 돌아오면 '오늘' 표시를 새로 한다.
  useDayChange(() => setToday(todayStr()));

  const { from, to } = monthRange(year, month);
  const items = useMemo(
    () => buildCalendarItems({ todos, series, completionLog, from, to, today }),
    [todos, series, completionLog, from, to, today],
  );
  const layout = useMemo(() => layoutMonth(items, year, month, MAX_LANES), [items, year, month]);

  const isCurrentMonth = from === `${today.slice(0, 7)}-01`;
  const selectedItems = selected ? itemsOnDate(items, selected) : [];

  function move(go: () => void) {
    go();
    setSelected(null); // 다른 달로 가면 고른 날짜는 버린다
  }

  function goThisMonth() {
    goTo(today);
    setSelected(today);
  }

  return (
    <main className="calendar">
      <PageHead title="캘린더" />

      <div className="calendar__box">
        <div className="calendar__wrap">
          <PeriodNav
            title={label}
            prevLabel="이전 달"
            nextLabel="다음 달"
            todayLabel="오늘"
            onPrev={() => move(goPrev)}
            onNext={() => move(goNext)}
            onToday={goThisMonth}
            todayDisabled={isCurrentMonth && selected === today}
          />

          <div className="calendar__grid">
            <div className="calendar__heads">
              {WEEKDAYS.map(d => (
                <div key={d} className="calendar__head">{d}</div>
              ))}
            </div>
            {layout.weeks.map(week => (
              <div key={week.dates.find(Boolean)} className="calendar__week">
                <div className="calendar__cells">
                  {week.dates.map((date, col) => {
                    if (!date) return <div key={`blank-${col}`} className="calendar__blank" />;
                    const day = Number(date.slice(8, 10));
                    const count = layout.total[date] ?? 0;
                    const extra = layout.hidden[date] ?? 0;
                    return (
                      <button
                        key={date}
                        type="button"
                        className={[
                          'calendar__day',
                          date === today ? 'calendar__day--today' : '',
                          date === selected ? 'calendar__day--selected' : '',
                        ].filter(Boolean).join(' ')}
                        onClick={() => setSelected(date)}
                        aria-pressed={date === selected}
                        aria-current={date === today ? 'date' : undefined}
                        aria-label={`${month + 1}월 ${day}일${count > 0 ? `, 일정 ${count}개` : ''}`}
                      >
                        <span className="calendar__num">{day}</span>
                        {extra > 0 && <span className="calendar__more">+{extra}</span>}
                        {count > 0 && <span className="calendar__count" aria-hidden="true">{count}</span>}
                      </button>
                    );
                  })}
                </div>
                <div className="calendar__bars" aria-hidden="true">
                  {week.bars.map(bar => (
                    <span
                      key={`${bar.item.key}-${bar.col}`}
                      className={[
                        itemClass(bar.item, 'calendar__bar'),
                        bar.continuesBefore ? 'calendar__bar--cont-before' : '',
                        bar.continuesAfter ? 'calendar__bar--cont-after' : '',
                      ].filter(Boolean).join(' ')}
                      style={{ gridColumn: `${bar.col} / span ${bar.span}`, gridRow: bar.lane + 1 }}
                    >
                      {bar.item.text}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <section className="calendar__detail" aria-live="polite">
            {selected ? (
              <>
                <h3 className="calendar__detail-tit">{formatMonthDayWeekday(selected)}</h3>
                {selectedItems.length === 0 ? (
                  <p className="calendar__empty">이 날은 등록된 일정이 없습니다.</p>
                ) : (
                  <ul className="calendar__list">
                    {selectedItems.map(item => (
                      <li key={item.key} className="calendar__item">
                        <span className={itemClass(item, 'calendar__badge')}>{KIND_LABEL[item.kind]}</span>
                        {item.upcoming && <span className="calendar__badge calendar__badge--plan">예정</span>}
                        {item.category && item.category !== '기본' && (
                          <span className="calendar__cat">{item.category}</span>
                        )}
                        {formatPeriod(item) && <span className="calendar__period">{formatPeriod(item)}</span>}
                        <span className={`calendar__item-txt${item.completed ? ' calendar__item-txt--done' : ''}`}>
                          {item.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="calendar__empty">날짜를 눌러 그날의 일정을 확인하세요.</p>
            )}
            <p className="calendar__hint">
              연차·휴가와 새 할 일은 <a className="calendar__link" href={viewHref('todos')}>할 일</a> 화면에서 등록합니다.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
