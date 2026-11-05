import { useState, useRef } from 'react';
import { useDismiss } from '../hooks/useDismiss';
import { useCalendarMonth, WEEKDAYS } from '../hooks/useCalendarMonth';
import { dateStr, todayStr } from '../utils/date';

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
  const blanks = Array.from({ length: blankCount }).map((_, i) => (
    <div key={`blank-${i}`} className="date-range-picker__cell date-range-picker__cell--empty" />
  ));

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
      : '';

  return (
    <div className={`date-range-picker ${className}`} ref={containerRef}>
      <div className="date-range-picker__trigger-wrap">
        <button
          type="button"
          className={`date-range-picker__input ${isOpen ? 'date-range-picker__input--active' : ''}`}
          onClick={handleToggle}
          aria-expanded={isOpen}
          aria-haspopup="dialog"
          aria-labelledby={ariaLabelledby}
        >
          <span className="date-range-picker__value">{displayText || <span className="date-range-picker__placeholder">{placeholder}</span>}</span>
        </button>
        <div className="date-range-picker__actions">
          {(startValue || endValue) && (
            <button type="button" className="date-range-picker__clear" onClick={handleClear} aria-label="초기화">
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          )}
          <span className="date-range-picker__icon" aria-hidden="true">📅</span>
        </div>
      </div>

      {isOpen && (
        <div className="date-range-picker__dropdown">
          <div className="date-range-picker__header">
            <button type="button" className="date-range-picker__nav" onClick={goPrev} aria-label="이전 달">&lt;</button>
            <span className="date-range-picker__month">{label}</span>
            <button type="button" className="date-range-picker__nav" onClick={goNext} aria-label="다음 달">&gt;</button>
          </div>

          <p className="date-range-picker__hint">{pendingStart ? '종료일을 선택하세요' : '시작일을 선택하세요'}</p>

          <div className="date-range-picker__grid">
            {WEEKDAYS.map(d => (
              <div key={d} className="date-range-picker__cell date-range-picker__cell--head">{d}</div>
            ))}
            {blanks}
            {days}
          </div>
        </div>
      )}
    </div>
  );
}
