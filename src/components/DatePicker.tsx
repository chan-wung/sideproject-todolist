import { useState, useRef, useEffect } from 'react';

interface Props {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  'aria-labelledby'?: string;
}

const DAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function DatePicker({ value, onChange, placeholder = '마감일 선택', className = '', 'aria-labelledby': ariaLabelledby }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 현재 달력에 표시할 연/월
  const [currentDate, setCurrentDate] = useState(() => {
    if (value) {
      const [y, m, d] = value.split('-');
      return new Date(Number(y), Number(m) - 1, Number(d));
    }
    return new Date();
  });

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
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

  function handleDayClick(day: number) {
    const y = year;
    const m = String(month + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    onChange(`${y}-${m}-${d}`);
    setIsOpen(false);
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  }

  // 달력 그리드 생성
  const blanks = Array.from({ length: firstDayOfMonth }).map((_, i) => (
    <div key={`blank-${i}`} className="date-picker__cell date-picker__cell--empty" />
  ));
  
  const days = Array.from({ length: daysInMonth }).map((_, i) => {
    const day = i + 1;
    const isSelected = value === `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
    
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
              <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" strokeWidth="2" fill="none"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          )}
          <span className="date-picker__icon" aria-hidden="true">📅</span>
        </div>
      </div>

      {isOpen && (
        <div className="date-picker__dropdown">
          <div className="date-picker__header">
            <button type="button" className="date-picker__nav" onClick={handlePrevMonth} aria-label="이전 달">&lt;</button>
            <span className="date-picker__month">{year}년 {month + 1}월</span>
            <button type="button" className="date-picker__nav" onClick={handleNextMonth} aria-label="다음 달">&gt;</button>
          </div>
          
          <div className="date-picker__grid">
            {DAYS.map(d => (
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
