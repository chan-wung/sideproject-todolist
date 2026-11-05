import { useMemo, useState } from 'react';
import type { Todo, RecurrenceSeries, CompletionLogEntry } from '../types/todo';
import { useCalendarMonth } from '../hooks/useCalendarMonth';
import { useDayChange } from '../hooks/useDayChange';
import { buildCalendarItems, itemsOnDate, layoutMonth, monthRange } from '../utils/calendar';
import { todayStr } from '../utils/date';
import { usePersistentState } from '../hooks/usePersistentState';
import PeriodNav from '../components/PeriodNav';
import PageHead from '../components/PageHead';
import CalendarMonthView from '../components/CalendarMonthView';
import CalendarDayDetail from '../components/CalendarDayDetail';

interface Props {
  todos: Todo[];
  series: RecurrenceSeries[];
  /** '완료 정리'로 목록에서 빠진 항목. 캘린더에는 원래 기간에 계속 보인다 */
  completionLog: CompletionLogEntry[];
}

const MAX_LANES = 3; // 한 주에 띠로 보여 주는 최대 줄 수. 넘으면 날짜 칸에 '+N'

// 월간 달력(보기 전용): 모든 할 일(완료·완료 정리된 것 포함), 연차, 정기 업무, 반복 일정의 앞날 예정을 보여 준다.
// 기간이 있는 항목은 시작일부터 마감일까지 이어진 띠로 그린다.
export default function CalendarPage({ todos, series, completionLog }: Props) {
  const [today, setToday] = useState(todayStr);
  const { year, month, label, goPrev, goNext, goTo } = useCalendarMonth(todayStr());
  const [selected, setSelected] = useState<string | null>(today);

  // 자정이 지나거나 탭으로 돌아오면 '오늘' 표시를 새로 한다.
  useDayChange(() => setToday(todayStr()));

  const { from, to } = monthRange(year, month);
  const [hideDone, setHideDone] = usePersistentState<boolean>('todolist-pref-calendar-hide-done', false);
  const allItems = useMemo(
    () => buildCalendarItems({ todos, series, completionLog, from, to, today }),
    [todos, series, completionLog, from, to, today],
  );
  // '완료한 항목 숨기기'를 켜면 완료한 할 일과 완료 정리된 이력을 띠·개수·목록에서 모두 뺀다
  const items = useMemo(() => (hideDone ? allItems.filter(i => !i.completed) : allItems), [allItems, hideDone]);
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

          <div className="calendar__tools">
            <label className="form-chk form-chk--checkbox">
              <input type="checkbox" checked={hideDone} onChange={e => setHideDone(e.target.checked)} />
              <span className="form-chk__text">완료한 항목 숨기기</span>
            </label>
          </div>

          <CalendarMonthView layout={layout} month={month} today={today} selected={selected} onSelect={setSelected} />

          <CalendarDayDetail selected={selected} items={selectedItems} />
        </div>
      </div>
    </main>
  );
}
