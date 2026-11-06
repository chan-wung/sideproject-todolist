import { useState, useRef } from 'react';
import { useDismiss } from '../hooks/useDismiss';
import { useCalendarMonth } from '../hooks/useCalendarMonth';
import { dateStr, formatFullDate, todayStr } from '../utils/date';
import { PickerTrigger, PickerHeader, PickerGrid } from './DatePickerParts';

interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  'aria-labelledby'?: string;
}

export default function DatePicker({ value, onChange, placeholder = '마감일 선택', className = '', 'aria-labelledby': ariaLabelledby }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  // 현재 달력에 표시할 연/월
  const { year, month, label, blankCount, dayCount, goPrev, goNext } = useCalendarMonth(value);

  useDismiss(containerRef, isOpen, () => setIsOpen(false), { focusRef: triggerRef });

  function handleDayClick(day: number) {
    onChange(dateStr(year, month, day));
    setIsOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  }

  // 달력 그리드 생성
  const today = todayStr();
  const days = Array.from({ length: dayCount }).map((_, i) => {
    const day = i + 1;
    const str = dateStr(year, month, day);
    const isSelected = value === str;
    const isToday = today === str;
    
    return (
      <button
        key={day}
        type="button"
        className={`date-picker__cell date-picker__cell--day${isSelected ? ' date-picker__cell--selected' : ''}${isToday ? ' date-picker__cell--today' : ''}`}
        onClick={() => handleDayClick(day)}
        data-day={day}
        aria-label={formatFullDate(str)}
        aria-pressed={isSelected}
        aria-current={isToday ? 'date' : undefined}
      >
        {day}
      </button>
    );
  });

  return (
    <div className={`date-picker ${className}`} ref={containerRef}>
      <PickerTrigger
        block="date-picker"
        isOpen={isOpen}
        onToggle={() => setIsOpen(!isOpen)}
        value={value || <span className="date-picker__placeholder">{placeholder}</span>}
        hasValue={!!value}
        onClear={handleClear}
        buttonRef={triggerRef}
        aria-labelledby={ariaLabelledby}
      />

      {isOpen && (
        <div className="date-picker__dropdown" role="dialog" aria-label="날짜 선택">
          <PickerHeader block="date-picker" label={label} onPrev={goPrev} onNext={goNext} />

          <PickerGrid block="date-picker" blankCount={blankCount}>
            {days}
          </PickerGrid>
        </div>
      )}
    </div>
  );
}
