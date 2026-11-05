import { useMemo, useState } from 'react';
import type { Todo, RecurrenceSeries, CompletionLogEntry } from '../types/todo';
import { CALENDAR_VIEW_LABEL, CALENDAR_VIEW_OPTIONS, type CalendarView } from '../constants/labels';
import { useDayChange } from '../hooks/useDayChange';
import { buildCalendarItems, itemsOnDate, layoutMonth, monthRange, sundayWeekDates } from '../utils/calendar';
import { addDaysStr, addMonthsClamped, formatMonthDayWeekday, todayStr } from '../utils/date';
import { usePersistentState } from '../hooks/usePersistentState';
import PeriodNav from '../components/PeriodNav';
import PageHead from '../components/PageHead';
import CalendarMonthView from '../components/CalendarMonthView';
import CalendarTimeGrid from '../components/CalendarTimeGrid';
import CalendarDayDetail from '../components/CalendarDayDetail';
import { cx } from '../utils/classNames';

interface Props {
  todos: Todo[];
  series: RecurrenceSeries[];
  /** '완료 정리'로 목록에서 빠진 항목. 캘린더에는 원래 기간에 계속 보인다 */
  completionLog: CompletionLogEntry[];
}

const MAX_LANES = 3; // 월 보기에서 한 주에 띠로 보여 주는 최대 줄 수. 넘으면 날짜 칸에 '+N'

// 이동 단위와 버튼 이름이 보기마다 다르다
const NAV_LABEL: Record<CalendarView, { prev: string; next: string }> = {
  month: { prev: '이전 달', next: '다음 달' },
  week: { prev: '이전 주', next: '다음 주' },
  day: { prev: '이전 날', next: '다음 날' },
};

// '2026-11-01' → '11.1'
const monthDot = (date: string) => `${Number(date.slice(5, 7))}.${Number(date.slice(8, 10))}`;

// 캘린더(보기 전용): 월·주·일 보기. 모든 할 일(완료·완료 정리된 것 포함), 연차, 정기 업무, 반복 일정의 앞날 예정을 보여 준다.
// 기간이 있는 항목은 시작일부터 마감일까지 이어진 띠로 그리고, 주·일 보기에서는 시각이 적힌 시간 연차를 시간 칸에 놓는다.
export default function CalendarPage({ todos, series, completionLog }: Props) {
  const [today, setToday] = useState(todayStr);
  // 보고 있는 날짜. 월 보기에서는 그 달 안의 한 날, 주 보기에서는 그 주 안의 한 날이다.
  const [anchor, setAnchor] = useState(todayStr);
  const [selected, setSelected] = useState<string | null>(today);
  const [savedView, setView] = usePersistentState<CalendarView>('todolist-pref-calendar-view', 'month');
  const view: CalendarView = CALENDAR_VIEW_OPTIONS.includes(savedView) ? savedView : 'month';

  // 자정이 지나거나 탭으로 돌아오면 '오늘' 표시를 새로 한다.
  useDayChange(() => setToday(todayStr()));

  const year = Number(anchor.slice(0, 4));
  const month = Number(anchor.slice(5, 7)) - 1; // 0=1월
  const weekDates = useMemo(() => sundayWeekDates(anchor), [anchor]);
  const visibleDates = useMemo(() => (view === 'week' ? weekDates : [anchor]), [view, weekDates, anchor]);

  const { from, to } = view === 'month'
    ? monthRange(year, month)
    : { from: visibleDates[0], to: visibleDates[visibleDates.length - 1] };

  const [hideDone, setHideDone] = usePersistentState<boolean>('todolist-pref-calendar-hide-done', false);
  const allItems = useMemo(
    () => buildCalendarItems({ todos, series, completionLog, from, to, today }),
    [todos, series, completionLog, from, to, today],
  );
  // '완료한 항목 숨기기'를 켜면 완료한 할 일과 완료 정리된 이력을 띠·개수·목록에서 모두 뺀다
  const items = useMemo(() => (hideDone ? allItems.filter(i => !i.completed) : allItems), [allItems, hideDone]);
  const layout = useMemo(() => layoutMonth(items, year, month, MAX_LANES), [items, year, month]);

  const selectedItems = selected ? itemsOnDate(items, selected) : [];

  function changeView(next: CalendarView) {
    setView(next);
    setSelected(anchor); // 보는 날짜는 그대로 두고, 그날을 골라 둔다
  }

  // 날짜를 고르면 보고 있는 날짜도 그날로 옮긴다 (주 보기에서 같은 주 안이면 화면은 그대로)
  function pick(date: string) {
    setAnchor(date);
    setSelected(date);
  }

  function move(dir: -1 | 1) {
    const next = view === 'month' ? addMonthsClamped(anchor, dir) : addDaysStr(anchor, view === 'week' ? dir * 7 : dir);
    setAnchor(next);
    setSelected(view === 'month' ? null : next); // 다른 달로 가면 고른 날짜는 버린다
  }

  function goToday() {
    setAnchor(today);
    setSelected(today);
  }

  const title = view === 'day' ? formatMonthDayWeekday(anchor) : `${year}년 ${month + 1}월`;
  const sub = view === 'week' ? `${monthDot(from)} ~ ${monthDot(to)}` : undefined;
  const todayVisible = view === 'month' ? today.slice(0, 7) === anchor.slice(0, 7) : visibleDates.includes(today);

  return (
    <main className="calendar">
      <PageHead title="캘린더" />

      <div className="calendar__box">
        <div className="calendar__wrap">
          <PeriodNav
            title={title}
            sub={sub}
            prevLabel={NAV_LABEL[view].prev}
            nextLabel={NAV_LABEL[view].next}
            todayLabel="오늘"
            onPrev={() => move(-1)}
            onNext={() => move(1)}
            onToday={goToday}
            todayDisabled={todayVisible && selected === today}
          />

          <div className="calendar__tools">
            <div className="calendar__views" role="group" aria-label="보기 방식">
              {CALENDAR_VIEW_OPTIONS.map(v => (
                <button
                  key={v}
                  type="button"
                  className={cx('calendar__view-btn', v === view ? 'calendar__view-btn--active' : '')}
                  aria-pressed={v === view}
                  onClick={() => changeView(v)}
                >
                  {CALENDAR_VIEW_LABEL[v]}
                </button>
              ))}
            </div>
            <label className="form-chk form-chk--checkbox">
              <input type="checkbox" checked={hideDone} onChange={e => setHideDone(e.target.checked)} />
              <span className="form-chk__text">완료한 항목 숨기기</span>
            </label>
          </div>

          {view === 'month' ? (
            <CalendarMonthView layout={layout} month={month} today={today} selected={selected} onSelect={pick} />
          ) : (
            <CalendarTimeGrid dates={visibleDates} items={items} today={today} selected={selected} onSelect={pick} />
          )}

          <CalendarDayDetail selected={selected} items={selectedItems} />
        </div>
      </div>
    </main>
  );
}
