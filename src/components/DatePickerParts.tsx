import type { KeyboardEvent, ReactNode, RefObject } from 'react';
import { WEEKDAYS } from '../hooks/useCalendarMonth';
import { CalendarIcon, ClearIcon } from './icons';

// DatePicker(날짜 하나)와 DateRangePicker(기간)가 같이 쓰는 마크업 조각.
// block은 클래스 접두사(`date-picker` / `date-range-picker`)라 BEM 클래스 이름은 각 선택기 그대로 나온다.

interface TriggerProps {
  block: string;
  isOpen: boolean;
  onToggle: () => void;
  /** 입력 칸 안에 보일 값 또는 placeholder */
  value: ReactNode;
  /** 값이 있어야 지우기 버튼이 나온다 */
  hasValue: boolean;
  onClear: (e: React.MouseEvent) => void;
  /** Esc로 닫은 뒤 포커스를 돌려받을 입력 버튼 */
  buttonRef?: RefObject<HTMLButtonElement>;
  'aria-labelledby'?: string;
}

export function PickerTrigger({ block, isOpen, onToggle, value, hasValue, onClear, buttonRef, 'aria-labelledby': ariaLabelledby }: TriggerProps) {
  return (
    <div className={`${block}__trigger-wrap`}>
      <button
        ref={buttonRef}
        type="button"
        className={`${block}__input ${isOpen ? `${block}__input--active` : ''}`}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-labelledby={ariaLabelledby}
      >
        <span className={`${block}__value`}>{value}</span>
      </button>
      <div className={`${block}__actions`}>
        {hasValue && (
          <button type="button" className={`${block}__clear`} onClick={onClear} aria-label="초기화">
            <ClearIcon />
          </button>
        )}
        <span className={`${block}__icon`} aria-hidden="true"><CalendarIcon size="1em" /></span>
      </div>
    </div>
  );
}

interface HeaderProps {
  block: string;
  label: string;
  onPrev: () => void;
  onNext: () => void;
}

export function PickerHeader({ block, label, onPrev, onNext }: HeaderProps) {
  return (
    <div className={`${block}__header`}>
      <button type="button" className={`${block}__nav`} onClick={onPrev} aria-label="이전 달">&lt;</button>
      <span className={`${block}__month`}>{label}</span>
      <button type="button" className={`${block}__nav`} onClick={onNext} aria-label="다음 달">&gt;</button>
    </div>
  );
}

interface GridProps {
  block: string;
  blankCount: number;
  /** 날짜 칸들(`<button>`) */
  children: ReactNode;
}

// 방향키로 옮길 칸 수 (좌우는 하루, 위아래는 한 주)
const ARROW_STEP: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };

// 요일 머리줄 + 앞 빈칸 + 날짜 칸. 날짜 칸은 data-day를 달고 있어야 방향키로 오갈 수 있다.
export function PickerGrid({ block, blankCount, children }: GridProps) {
  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const step = ARROW_STEP[e.key];
    if (step === undefined) return;
    const days = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('button[data-day]'));
    const current = days.indexOf(document.activeElement as HTMLButtonElement);
    if (current === -1) return;
    e.preventDefault();
    days[Math.min(days.length - 1, Math.max(0, current + step))].focus(); // 이번 달 안에서만 움직인다
  }

  return (
    <div className={`${block}__grid`} onKeyDown={handleKeyDown}>
      {WEEKDAYS.map(d => (
        <div key={d} className={`${block}__cell ${block}__cell--head`}>{d}</div>
      ))}
      {Array.from({ length: blankCount }).map((_, i) => (
        <div key={`blank-${i}`} className={`${block}__cell ${block}__cell--empty`} />
      ))}
      {children}
    </div>
  );
}
