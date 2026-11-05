import type { TodoKind } from '../types/todo';
import { normalizeRange } from '../utils/date';
import DatePicker from './DatePicker';
import DateRangePicker from './DateRangePicker';

interface Props {
  kind: TodoKind;
  startDate: string;
  dueDate: string;
  onChange: (range: { startDate: string; dueDate: string }) => void;
  className?: string;
  'aria-labelledby'?: string;
}

// 할 일 등록·편집 폼이 같이 쓰는 날짜 칸.
// 연차·휴가는 보고서가 하루 기준이라 날짜 하나, 그 밖의 종류는 시작일~마감일 기간(마감일만도 가능)을 고른다.
export default function TodoDateField({ kind, startDate, dueDate, onChange, className, 'aria-labelledby': ariaLabelledby }: Props) {
  if (kind === 'leave') {
    return (
      <DatePicker
        value={dueDate}
        onChange={date => onChange({ startDate: '', dueDate: date })}
        placeholder="날짜 선택"
        className={className}
        aria-labelledby={ariaLabelledby}
      />
    );
  }

  // 하루짜리(마감일만)는 기간 칸의 '시작' 자리에 보여 준다
  return (
    <DateRangePicker
      startValue={startDate || dueDate}
      endValue={startDate ? dueDate : ''}
      onChange={(start, end) => {
        const range = normalizeRange(start, end);
        onChange({ startDate: range.startDate ?? '', dueDate: range.dueDate ?? '' });
      }}
      placeholder="시작일 ~ 마감일"
      className={className}
      aria-labelledby={ariaLabelledby}
    />
  );
}
