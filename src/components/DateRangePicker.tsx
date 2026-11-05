import { useState, useRef } from 'react';
import { useDismiss } from '../hooks/useDismiss';
import { useCalendarMonth } from '../hooks/useCalendarMonth';
import { dateStr, todayStr } from '../utils/date';
import { PickerTrigger, PickerHeader, PickerGrid } from './DatePickerParts';

interface Props {
  startValue: string;
  endValue: string;
  onChange: (start: string, end: string) => void;
  placeholder?: string;
  className?: string;
  'aria-labelledby'?: string;
}

export default function DateRangePicker({ startValue, endValue, onChange, placeholder = '기간 선택', className = '', 'aria-labelledby': ariaLabelledby }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  // 시작일 클릭 후 종료일을 아직 고르지 않은 동안의 임시 앵커
  const [pendingStart, setPendingStart] = useState<string | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { year, month, label, blankCount, dayCount, goPrev, goNext } = useCalendarMonth(startValue || endValue);

  useDismiss(containerRef, isOpen, () => {
    setIsOpen(false);
    setPendingStart(null);
    setHoverDate(null);
  }, { escape: false });

  function handleDayClick(dateStr: string) {
    if (!pendingStart) {
      setPendingStart(dateStr);
      setHoverDate(null);
      onChange(dateStr, '');
      return;
    }
    const start = pendingStart < dateStr ? pendingStart : dateStr;
    const end = pendingStart < dateStr ? dateStr : pendingStart;
    onChange(start, end);
    setPendingStart(null);
    setHoverDate(null);
    setIsOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange('', '');
    setPendingStart(null);
    setHoverDate(null);
    setIsOpen(false);
  }

  function handleToggle() {
    setIsOpen(prev => !prev);
    setPendingStart(null);
    setHoverDate(null);
  }

  // 진행 중인 드래그 미리보기 또는 확정된 범위 중 실제로 화면에 표시할 경계를 계산
  const anchorStart = pendingStart ?? (startValue || null);
  const anchorEnd = pendingStart ? (hoverDate ?? pendingStart) : (endValue || null);
  const rangeLow = anchorStart && anchorEnd ? (anchorStart < anchorEnd ? anchorStart : anchorEnd) : anchorStart;
  const rangeHigh = anchorStart && anchorEnd ? (anchorStart < anchorEnd ? anchorEnd : anchorStart) : anchorStart;

  const today = todayStr();
  const days = Array.from({ length: dayCount }).map((_, i) => {
    const day = i + 1;
    const str = dateStr(year, month, day);
    const isToday = today === str;
    const isInRange = !!(rangeLow && rangeHigh && str >= rangeLow && str <= rangeHigh);
    const isRangeStart = str === rangeLow;
    const isRangeEnd = str === rangeHigh;

    return (
      <button
        key={day}
        type="button"
        className={[
          'date-range-picker__cell',
          'date-range-picker__cell--day',
          isToday ? 'date-range-picker__cell--today' : '',
          isInRange ? 'date-range-picker__cell--in-range' : '',
          isRangeStart ? 'date-range-picker__cell--range-start' : '',
          isRangeEnd ? 'date-range-picker__cell--range-end' : '',
        ].filter(Boolean).join(' ')}
        onClick={() => handleDayClick(str)}
        onMouseEnter={() => { if (pendingStart) setHoverDate(str); }}
      >
        {day}
      </button>
    );
  });

  const displayText = startValue && endValue
    ? `${startValue} ~ ${endValue}`
    : pendingStart
      ? `${pendingStart} ~ 종료일 선택`
      : startValue || endValue; // 하루만 고른 경우도 그 날짜를 보여 준다

  return (
    <div className={`date-range-picker ${className}`} ref={containerRef}>
      <PickerTrigger
        block="date-range-picker"
        isOpen={isOpen}
        onToggle={handleToggle}
        value={displayText || <span className="date-range-picker__placeholder">{placeholder}</span>}
        hasValue={!!(startValue || endValue)}
        onClear={handleClear}
        aria-labelledby={ariaLabelledby}
      />

      {isOpen && (
        <div className="date-range-picker__dropdown">
          <PickerHeader block="date-range-picker" label={label} onPrev={goPrev} onNext={goNext} />

          <p className="date-range-picker__hint">{pendingStart ? '종료일을 선택하세요 (하루만이면 같은 날을 다시 누르세요)' : '시작일을 선택하세요'}</p>

          <PickerGrid block="date-range-picker" blankCount={blankCount}>
            {days}
          </PickerGrid>
        </div>
      )}
    </div>
  );
}
