import { useState, useRef, useEffect } from 'react';

interface Props {
  startValue: string;
  endValue: string;
  onChange: (start: string, end: string) => void;
  placeholder?: string;
  className?: string;
  'aria-labelledby'?: string;
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function DateRangePicker({ startValue, endValue, onChange, placeholder = '기간 선택', className = '', 'aria-labelledby': ariaLabelledby }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  // 시작일 클릭 후 종료일을 아직 고르지 않은 동안의 임시 앵커
  const [pendingStart, setPendingStart] = useState<string | null>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [currentDate, setCurrentDate] = useState(() => {
    const anchor = startValue || endValue;
    if (anchor) {
      const [y, m, d] = anchor.split('-');
      return new Date(Number(y), Number(m) - 1, Number(d));
    }
    return new Date();
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setPendingStart(null);
        setHoverDate(null);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  function handlePrevMonth() {
    setCurrentDate(new Date(year, month - 1, 1));
  }

  function handleNextMonth() {
    setCurrentDate(new Date(year, month + 1, 1));
  }

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

  const blanks = Array.from({ length: firstDayOfMonth }).map((_, i) => (
    <div key={`blank-${i}`} className="date-range-picker__cell date-range-picker__cell--empty" />
  ));

  const days = Array.from({ length: daysInMonth }).map((_, i) => {
    const day = i + 1;
    const dateStr = toDateStr(year, month, day);
    const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
    const isInRange = !!(rangeLow && rangeHigh && dateStr >= rangeLow && dateStr <= rangeHigh);
    const isRangeStart = dateStr === rangeLow;
    const isRangeEnd = dateStr === rangeHigh;

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
        onClick={() => handleDayClick(dateStr)}
        onMouseEnter={() => { if (pendingStart) setHoverDate(dateStr); }}
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
            <button type="button" className="date-range-picker__nav" onClick={handlePrevMonth} aria-label="이전 달">&lt;</button>
            <span className="date-range-picker__month">{year}년 {month + 1}월</span>
            <button type="button" className="date-range-picker__nav" onClick={handleNextMonth} aria-label="다음 달">&gt;</button>
          </div>

          <p className="date-range-picker__hint">{pendingStart ? '종료일을 선택하세요' : '시작일을 선택하세요'}</p>

          <div className="date-range-picker__grid">
            {DAYS.map(d => (
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
