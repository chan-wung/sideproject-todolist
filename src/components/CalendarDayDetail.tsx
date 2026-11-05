import { KIND_LABEL } from '../constants/labels';
import { formatPeriod, type CalendarItem } from '../utils/calendar';
import { formatMonthDayWeekday } from '../utils/date';
import { itemClass } from '../utils/calendarClass';
import ViewLink from './ViewLink';

interface Props {
  /** 고른 날 ('YYYY-MM-DD'). 없으면 안내 문구만 보인다 */
  selected: string | null;
  items: CalendarItem[];
}

// 고른 날의 일정 목록 (월·주·일 보기가 같이 쓴다)
export default function CalendarDayDetail({ selected, items }: Props) {
  return (
    <section className="calendar__detail" aria-live="polite">
      {selected ? (
        <>
          <h3 className="calendar__detail-tit">{formatMonthDayWeekday(selected)}</h3>
          {items.length === 0 ? (
            <p className="calendar__empty">이 날은 등록된 일정이 없습니다.</p>
          ) : (
            <ul className="calendar__list">
              {items.map(item => (
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
        연차·휴가와 새 할 일은 <ViewLink className="calendar__link" view="todos">할 일</ViewLink> 화면에서 등록합니다.
      </p>
    </section>
  );
}
