import { formatReportDate } from '../utils/date';
import type { LeaveInput, LeaveStatus } from '../utils/leave';

interface Props {
  value: LeaveInput;
  onChange: (next: LeaveInput) => void;
  /** 고른 날짜 'YYYY-MM-DD' (보고서에 찍힐 모양 미리보기에 쓴다. 아직 안 골랐으면 빈 문자열) */
  date: string;
  /** leaveStatus()로 계산한 안내·등록 가능 여부 */
  status: LeaveStatus;
}

// 할 일 입력창에서 종류를 '연차·휴가'로 골랐을 때 글 입력칸 대신 나오는 입력칸 묶음.
// 연차 종류 셀렉트는 입력창의 옵션 줄(TodoInput)에 있고, 여기서는 그 종류에 따라 시간 연차일 때만
// 시작·종료 시각, 기타일 때만 이름 칸이 나온다. 사유는 자유 입력.
// 값과 등록은 바깥(TodoInput)이 들고 있고, 이 컴포넌트는 칸과 안내만 그린다.
export default function LeaveFields({ value, onChange, date, status }: Props) {
  const set = (patch: Partial<LeaveInput>) => onChange({ ...value, ...patch });

  return (
    <div className="leave-fields">
      <div className="leave-fields__row">
        {value.type === 'hourly' && (
          <>
            <label className="leave-fields__field">
              <span className="leave-fields__label">시작 시각</span>
              <input className="leave-fields__control" type="time" value={value.start} onChange={e => set({ start: e.target.value })} />
            </label>
            <label className="leave-fields__field">
              <span className="leave-fields__label">종료 시각</span>
              <input className="leave-fields__control" type="time" value={value.end} onChange={e => set({ end: e.target.value })} />
            </label>
          </>
        )}

        {value.type === 'custom' && (
          <label className="leave-fields__field leave-fields__field--grow">
            <span className="leave-fields__label">휴가 이름</span>
            <input
              className="leave-fields__control"
              type="text"
              placeholder="예: 병가, 경조사 휴가"
              value={value.name}
              onChange={e => set({ name: e.target.value })}
              autoComplete="off"
            />
          </label>
        )}

        <label className="leave-fields__field leave-fields__field--grow">
          <span className="leave-fields__label">사유 (선택)</span>
          <input
            className="leave-fields__control"
            type="text"
            placeholder="예: 병원 진료, 자녀 행사"
            value={value.reason}
            onChange={e => set({ reason: e.target.value })}
            autoComplete="off"
          />
        </label>
      </div>

      <div className="leave-fields__info" aria-live="polite">
        {status.timeError && <p className="leave-fields__hint leave-fields__hint--error">{status.timeError}</p>}
        {status.duplicate && <p className="leave-fields__hint leave-fields__hint--error">이 날 이미 같은 연차·휴가가 등록되어 있습니다.</p>}
        {!date && <p className="leave-fields__hint">위의 날짜 칸에서 연차·휴가 날짜를 골라 주세요.</p>}
        {date && status.text && !status.duplicate && (
          <p className="leave-fields__hint">보고서에는 “{formatReportDate(date)} {status.text}”로 들어갑니다.</p>
        )}
      </div>
    </div>
  );
}
