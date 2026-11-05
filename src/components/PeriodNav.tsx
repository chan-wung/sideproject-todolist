interface Props {
  title: string;
  /** 제목 아래 작은 글씨 (예: 주의 날짜 범위). 없으면 생략 */
  sub?: string;
  prevLabel: string;
  nextLabel: string;
  todayLabel: string;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  todayDisabled: boolean;
}

// 기간(주·달)을 앞뒤로 옮기고 오늘 쪽으로 돌아오는 막대. 주간보고와 캘린더가 같이 쓴다.
export default function PeriodNav({ title, sub, prevLabel, nextLabel, todayLabel, onPrev, onNext, onToday, todayDisabled }: Props) {
  return (
    <div className="period-nav">
      <button type="button" className="period-nav__btn" onClick={onPrev} aria-label={prevLabel}>
        <span aria-hidden="true">&lsaquo;</span>
      </button>
      <p className="period-nav__period" aria-live="polite">
        <span className="period-nav__tit">{title}</span>
        {sub && <span className="period-nav__sub">{sub}</span>}
      </p>
      <button type="button" className="period-nav__btn" onClick={onNext} aria-label={nextLabel}>
        <span aria-hidden="true">&rsaquo;</span>
      </button>
      <button type="button" className="period-nav__today-btn" onClick={onToday} disabled={todayDisabled}>
        {todayLabel}
      </button>
    </div>
  );
}
