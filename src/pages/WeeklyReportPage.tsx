import { useMemo, useState } from 'react';
import type { Todo, CompletionLogEntry } from '../types/todo';
import { useDayChange } from '../hooks/useDayChange';
import PeriodNav from '../components/PeriodNav';
import { formatReportDate, startOfWeek, todayStr } from '../utils/date';
import { buildWeeklyReport, shiftWeek } from '../utils/weeklyReport';

interface Props {
  todos: Todo[];
  completionLog: CompletionLogEntry[];
  onCopy: (text: string, successMessage: string) => void;
}

// '2026.11.2' → '11.2'
const monthDay = (dateStr: string) => formatReportDate(dateStr).slice(5);

// 한 주(월~일)에 완료한 일을 주간보고 양식으로 모아 보여 주고, 엑셀 한 칸에 붙여넣을 수 있게 복사한다.
export default function WeeklyReportPage({ todos, completionLog, onCopy }: Props) {
  const [today, setToday] = useState(todayStr);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(todayStr()));
  // 복사 전에 손으로 고친 내용. null이면 자동으로 만든 글을 그대로 쓴다. 저장하지 않고, 주를 옮기면 버린다.
  const [edited, setEdited] = useState<string | null>(null);

  // 자정이 지나거나 탭으로 돌아오면 '이번 주' 판단을 새로 한다.
  useDayChange(() => setToday(todayStr()));

  const report = useMemo(
    () => buildWeeklyReport({ weekStart, todos, completionLog }),
    [weekStart, todos, completionLog],
  );

  const currentWeekStart = startOfWeek(today);
  const text = edited ?? report.text;
  const isBlank = text.trim() === '';
  const year = weekStart.slice(0, 4);

  function moveWeek(weeks: number) {
    setWeekStart(prev => shiftWeek(prev, weeks));
    setEdited(null);
  }

  function goThisWeek() {
    setWeekStart(currentWeekStart);
    setEdited(null);
  }

  return (
    <main className="weekly-report">
      <div className="weekly-report__box">
        <div className="weekly-report__wrap">
          <h1 className="weekly-report__tit">주간보고</h1>

          <PeriodNav
            title={`${year}년 ${report.label}`}
            sub={`${monthDay(report.weekStart)} ~ ${monthDay(report.weekEnd)}`}
            prevLabel="지난주"
            nextLabel="다음주"
            todayLabel="이번 주"
            onPrev={() => moveWeek(-1)}
            onNext={() => moveWeek(1)}
            onToday={goThisWeek}
            todayDisabled={weekStart === currentWeekStart}
          />

          {report.isEmpty && edited === null && (
            <p className="weekly-report__empty">
              이 주에 완료한 일이 없습니다. 할 일을 완료하거나, 매주 하는 일은 종류를 “정기 업무”로, 연차는 “연차·휴가”로 등록해 보세요.
            </p>
          )}

          <div className="weekly-report__field">
            <label className="screen-out" htmlFor="weekly-report-text">주간보고 내용</label>
            <textarea
              id="weekly-report-text"
              className="weekly-report__textarea"
              value={text}
              onChange={e => setEdited(e.target.value)}
              rows={12}
              spellCheck={false}
            />
          </div>

          <div className="weekly-report__actions">
            <button
              type="button"
              className="btn btn--main"
              onClick={() => onCopy(text, '주간보고를 클립보드에 복사했습니다.')}
              disabled={isBlank}
            >
              텍스트 복사
            </button>
            {edited !== null && (
              <button type="button" className="weekly-report__reset-btn" onClick={() => setEdited(null)}>
                자동으로 만든 내용으로 되돌리기
              </button>
            )}
          </div>

          <p className="weekly-report__hint">
            엑셀에는 칸을 더블클릭해 편집 상태로 만든 뒤 붙여넣으면 한 칸에 여러 줄로 들어갑니다. 칸을 선택만 하고 붙여넣으면 줄마다 다른 칸으로 나뉠 수 있습니다.
          </p>
        </div>
      </div>
    </main>
  );
}
