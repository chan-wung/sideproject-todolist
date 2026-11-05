import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { WEEKDAYS } from '../utils/date';
import { layoutTimed, layoutWeek, timedRange, type CalendarItem } from '../utils/calendar';
import { itemClass, weekendMod } from '../utils/calendarClass';
import { cx } from '../utils/classNames';
import { leaveTimeRange } from '../utils/leave';

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const FIRST_VISIBLE_HOUR = 8; // 처음 열 때 맨 위에 보이는 시각

interface Props {
  /** 보이는 날짜들 (주 보기 7개, 일 보기 1개) */
  dates: string[];
  /** 보이는 범위의 항목 전체 */
  items: CalendarItem[];
  today: string;
  selected: string | null;
  onSelect: (date: string) => void;
}

function nowMinutes(): number {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

// 주·일 보기: 위에 요일/날짜 머리글, 그 아래 종일 줄, 아래에 0~24시 시간 눈금.
// 일반·정기 업무는 시각이 없으므로 종일 줄에 띠로, 시각이 적힌 시간 연차는 시간 칸에 블록으로 놓는다.
export default function CalendarTimeGrid({ dates, items, today, selected, onSelect }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(nowMinutes);

  // 지금 시각 선을 1분마다 옮긴다
  useEffect(() => {
    const id = window.setInterval(() => setNow(nowMinutes()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  // 처음 열 때(그리고 주·일을 바꿀 때) 오전 8시 근처가 보이게 한다
  const viewKey = dates.length;
  useEffect(() => {
    const scroller = scrollRef.current;
    const body = bodyRef.current;
    // 위에 붙는 머리글이 body 앞에 있으므로, 이만큼 내리면 그 시각 눈금선이 머리글 바로 아래에 온다.
    // 눈금선에 걸친 시각 글자가 가려지지 않게 조금 덜 내린다.
    if (scroller && body) scroller.scrollTop = (body.offsetHeight / 24) * FIRST_VISIBLE_HOUR - 10;
  }, [viewKey]);

  const allDayItems = useMemo(() => items.filter(i => !timedRange(i)), [items]);
  const allDay = useMemo(() => layoutWeek(allDayItems, dates, Number.MAX_SAFE_INTEGER), [allDayItems, dates]);
  const columns = useMemo(() => dates.map(date => layoutTimed(items, date).timed), [items, dates]);
  const colsStyle = { '--calendar-cols': dates.length } as CSSProperties;

  return (
    <div className={cx('calendar__time', dates.length === 1 ? 'calendar__time--day' : 'calendar__time--week')} style={colsStyle}>
      <div className="calendar__time-scroll" ref={scrollRef}>
        <div className="calendar__time-top">
          <div className="calendar__time-heads">
            <div className="calendar__time-gutter" />
            {dates.map((date, i) => {
              const dow = new Date(`${date}T00:00:00`).getDay();
              const count = (allDay.total[date] ?? 0) + columns[i].length;
              const day = Number(date.slice(8, 10));
              return (
                <button
                  key={date}
                  type="button"
                  className={cx(
                    'calendar__time-head',
                    date === today ? 'calendar__time-head--today' : '',
                    date === selected ? 'calendar__time-head--selected' : '',
                  )}
                  onClick={() => onSelect(date)}
                  aria-pressed={date === selected}
                  aria-current={date === today ? 'date' : undefined}
                  aria-label={`${Number(date.slice(5, 7))}월 ${day}일 ${WEEKDAYS[dow]}요일${count > 0 ? `, 일정 ${count}개` : ''}`}
                >
                  <span className={cx('calendar__head', weekendMod('calendar__head', dow))}>{WEEKDAYS[dow]}</span>
                  <span className={cx('calendar__time-num', weekendMod('calendar__time-num', dow))}>{day}</span>
                </button>
              );
            })}
          </div>

          <div className="calendar__allday">
            <div className="calendar__allday-label">종일</div>
            <div className="calendar__allday-bars">
              {allDay.bars.map(bar => (
                <span
                  key={`${bar.item.key}-${bar.col}`}
                  className={cx(
                    itemClass(bar.item, 'calendar__bar'),
                    bar.continuesBefore ? 'calendar__bar--cont-before' : '',
                    bar.continuesAfter ? 'calendar__bar--cont-after' : '',
                  )}
                  style={{ gridColumn: `${bar.col} / span ${bar.span}`, gridRow: bar.lane + 1 }}
                  title={bar.item.text}
                >
                  {bar.item.text}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="calendar__time-body" ref={bodyRef}>
          <div className="calendar__hours" aria-hidden="true">
            {HOURS.map(h => (
              <span key={h} className="calendar__hour">{h === 0 ? '' : `${h}시`}</span>
            ))}
          </div>
          {dates.map((date, i) => (
            <div key={date} className={cx('calendar__time-col', date === today ? 'calendar__time-col--today' : '')}>
              {columns[i].map(block => {
                const range = leaveTimeRange(block.item.text);
                return (
                  <div
                    key={block.item.key}
                    className={itemClass(block.item, 'calendar__event')}
                    style={{
                      top: `${(block.startMin / 1440) * 100}%`,
                      height: `${((block.endMin - block.startMin) / 1440) * 100}%`,
                      left: `${(block.column / block.columns) * 100}%`,
                      width: `${100 / block.columns}%`,
                    }}
                    title={range ? `${range.start}~${range.end} ${block.item.text}` : block.item.text}
                  >
                    {block.item.text}
                  </div>
                );
              })}
              {date === today && <div className="calendar__now" style={{ top: `${(now / 1440) * 100}%` }} aria-hidden="true" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
