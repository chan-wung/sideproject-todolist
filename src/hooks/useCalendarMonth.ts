import { useState } from 'react';
import { daysInMonth, WEEKDAYS } from '../utils/date';

export { WEEKDAYS };

// 'YYYY-MM-DD'가 있으면 그 달을, 없거나 비어 있으면 이번 달을 처음에 보여 준다.
function initialMonth(anchor: string): Date {
  if (anchor) {
    const [y, m, d] = anchor.split('-');
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  return new Date();
}

// 달력에 보이는 달(연·월)과 이전·다음 달 이동, 그 달의 앞 빈칸·일수를 다룬다.
// DatePicker·DateRangePicker처럼 달력 칸을 그리는 곳에서 같이 쓴다.
export function useCalendarMonth(anchor: string) {
  const [current, setCurrent] = useState(() => initialMonth(anchor));

  const year = current.getFullYear();
  const month = current.getMonth(); // 0=1월

  return {
    year,
    month,
    label: `${year}년 ${month + 1}월`,
    blankCount: new Date(year, month, 1).getDay(), // 1일이 시작하는 요일(일=0) 앞에 둘 빈칸 수
    dayCount: daysInMonth(year, month),
    goPrev: () => setCurrent(new Date(year, month - 1, 1)),
    goNext: () => setCurrent(new Date(year, month + 1, 1)),
    goTo: (date: string) => setCurrent(initialMonth(date)), // 'YYYY-MM-DD'가 속한 달로
  };
}
