import { WEEKDAYS } from '../hooks/useCalendarMonth';
import type { MonthLayout } from '../utils/calendar';
import { itemClass, weekendMod } from '../utils/calendarClass';
import { cx } from '../utils/classNames';

interface Props {
  layout: MonthLayout;
  month: number; // 0=1월
  today: string;
  selected: string | null;
  onSelect: (date: string) => void;
}

// 월간 달력 격자: 요일 줄 + 주마다 날짜 칸 층과 그 위에 얹는 띠 층
export default function CalendarMonthView({ layout, month, today, selected, onSelect }: Props) {
  return (
    <div className="calendar__grid">
      <div className="calendar__heads">
        {WEEKDAYS.map((d, col) => (
          <div key={d} className={cx('calendar__head', weekendMod('calendar__head', col))}>{d}</div>
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
                  className={cx(
                    'calendar__day',
                    date === today ? 'calendar__day--today' : '',
                    date === selected ? 'calendar__day--selected' : '',
                    weekendMod('calendar__day', col),
                  )}
                  onClick={() => onSelect(date)}
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
                className={cx(
                  itemClass(bar.item, 'calendar__bar'),
                  bar.continuesBefore ? 'calendar__bar--cont-before' : '',
                  bar.continuesAfter ? 'calendar__bar--cont-after' : '',
                )}
                style={{ gridColumn: `${bar.col} / span ${bar.span}`, gridRow: bar.lane + 1 }}
              >
                {bar.item.text}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
