import { useState, useRef } from 'react';
import { useDismiss } from '../hooks/useDismiss';
import { useCalendarMonth, WEEKDAYS } from '../hooks/useCalendarMonth';
import { dateStr, todayStr } from '../utils/date';
import { ClearIcon } from './icons';

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

  // 현재 달력에 표시할 연/월
  const { year, month, label, blankCount, dayCount, goPrev, goNext } = useCalendarMonth(value);

  useDismiss(containerRef, isOpen, () => setIsOpen(false), { escape: false });

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
  const blanks = Array.from({ length: blankCount }).map((_, i) => (
    <div key={`blank-${i}`} className="date-picker__cell date-picker__cell--empty" />
  ));
  
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
      >
        {day}
      </button>
    );
  });

  return (
    <div className={`date-picker ${className}`} ref={containerRef}>
      <div className="date-picker__trigger-wrap">
        <button 
          type="button"
          className={`date-picker__input ${isOpen ? 'date-picker__input--active' : ''}`} 
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-labelledby={ariaLabelledby}
        >
          <span className="date-picker__value">{value || <span className="date-picker__placeholder">{placeholder}</span>}</span>
        </button>
        <div className="date-picker__actions">
          {value && (
            <button type="button" className="date-picker__clear" onClick={handleClear} aria-label="초기화">
              <ClearIcon />
            </button>
          )}
          <span className="date-picker__icon" aria-hidden="true">📅</span>
        </div>
      </div>

      {isOpen && (
        <div className="date-picker__dropdown">
          <div className="date-picker__header">
            <button type="button" className="date-picker__nav" onClick={goPrev} aria-label="이전 달">&lt;</button>
            <span className="date-picker__month">{label}</span>
            <button type="button" className="date-picker__nav" onClick={goNext} aria-label="다음 달">&gt;</button>
          </div>
          
          <div className="date-picker__grid">
            {WEEKDAYS.map(d => (
              <div key={d} className="date-picker__cell date-picker__cell--head">{d}</div>
            ))}
            {blanks}
            {days}
          </div>
        </div>
      )}
    </div>
  );
}
