import { useMemo, useState } from 'react';
import type { Todo, RecurrenceSeries } from '../types/todo';
import { KIND_LABEL } from '../constants/labels';
import { useCalendarMonth, WEEKDAYS } from '../hooks/useCalendarMonth';
import { useDayChange } from '../hooks/useDayChange';
import { buildCalendarItems, monthRange, type CalendarItem } from '../utils/calendar';
import { dateStr, formatMonthDayWeekday, todayStr } from '../utils/date';
import PeriodNav from '../components/PeriodNav';
import LeaveForm from '../components/LeaveForm';

interface Props {
  todos: Todo[];
  series: RecurrenceSeries[];
  /** 고른 날짜에 연차·휴가를 등록한다 */
  onAddLeave: (date: string, text: string) => void;
}

const MAX_CHIPS = 3; // 한 칸에 글자로 보여 주는 최대 항목 수. 넘으면 '+N'

function itemClass(item: CalendarItem, block: string): string {
  return [
    block,
    `${block}--${item.kind}`,
    item.upcoming ? `${block}--upcoming` : '',
    item.completed ? `${block}--done` : '',
  ].filter(Boolean).join(' ');
}

// 월간 달력: 마감일이 있는 할 일, 연차, 정기 업무, 반복 일정의 앞날 예정을 날짜 칸에 보여 준다.
export default function CalendarPage({ todos, series, onAddLeave }: Props) {
  const [today, setToday] = useState(todayStr);
  const { year, month, label, blankCount, dayCount, goPrev, goNext, goTo } = useCalendarMonth(todayStr());
  const [selected, setSelected] = useState<string | null>(today);

  // 자정이 지나거나 탭으로 돌아오면 '오늘' 표시를 새로 한다.
  useDayChange(() => setToday(todayStr()));

  const { from, to } = monthRange(year, month);
  const items = useMemo(
    () => buildCalendarItems({ todos, series, from, to, today }),
    [todos, series, from, to, today],
  );

  const isCurrentMonth = from === `${today.slice(0, 7)}-01`;
  const selectedItems = selected ? items[selected] ?? [] : [];

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
      <div className="calendar__box">
        <div className="calendar__wrap">
          <h1 className="calendar__tit">캘린더</h1>

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
            {WEEKDAYS.map(d => (
              <div key={d} className="calendar__head">{d}</div>
            ))}
            {Array.from({ length: blankCount }).map((_, i) => (
              <div key={`blank-${i}`} className="calendar__blank" />
            ))}
            {Array.from({ length: dayCount }).map((_, i) => {
              const day = i + 1;
              const date = dateStr(year, month, day);
              const dayItems = items[date] ?? [];
              const extra = dayItems.length - MAX_CHIPS;
              return (
                <button
                  key={day}
                  type="button"
                  className={[
                    'calendar__day',
                    date === today ? 'calendar__day--today' : '',
                    date === selected ? 'calendar__day--selected' : '',
                  ].filter(Boolean).join(' ')}
                  onClick={() => setSelected(date)}
                  aria-pressed={date === selected}
                  aria-current={date === today ? 'date' : undefined}
                  aria-label={`${month + 1}월 ${day}일${dayItems.length > 0 ? `, 일정 ${dayItems.length}개` : ''}`}
                >
                  <span className="calendar__num">{day}</span>
                  {dayItems.slice(0, MAX_CHIPS).map(item => (
                    <span key={item.key} className={itemClass(item, 'calendar__chip')}>{item.text}</span>
                  ))}
                  {extra > 0 && <span className="calendar__more">+{extra}</span>}
                  {dayItems.length > 0 && <span className="calendar__count" aria-hidden="true">{dayItems.length}</span>}
                </button>
              );
            })}
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
                        <span className={`calendar__item-txt${item.completed ? ' calendar__item-txt--done' : ''}`}>
                          {item.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <LeaveForm
                  key={selected}
                  date={selected}
                  savedLeaves={selectedItems.filter(i => i.kind === 'leave').map(i => i.text)}
                  onSubmit={text => onAddLeave(selected, text)}
                />
              </>
            ) : (
              <p className="calendar__empty">날짜를 눌러 그날의 일정을 확인하세요.</p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
