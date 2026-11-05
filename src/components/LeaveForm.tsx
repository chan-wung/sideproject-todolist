import { useState } from 'react';
import { LEAVE_TYPES, type LeaveType } from '../constants/labels';
import { formatReportDate } from '../utils/date';
import { composeLeaveText, isSameLeave, leaveBase, leaveError } from '../utils/leave';

interface Props {
  /** 등록할 날짜 'YYYY-MM-DD' */
  date: string;
  /** 그날 이미 등록된 연차·휴가의 제목들 (같은 이름의 중복 등록을 막는 데 쓴다) */
  savedLeaves: string[];
  /** 이름·시각·사유를 합친 한 줄로 등록을 요청한다 */
  onSubmit: (text: string) => void;
}

// 날짜를 고른 뒤 연차·휴가를 한 번에 등록하는 폼.
// 종류는 셀렉박스로 고르고, 시간 연차일 때만 시작·종료 시각, 기타일 때만 이름 칸이 나온다. 사유는 자유 입력.
export default function LeaveForm({ date, savedLeaves, onSubmit }: Props) {
  const [type, setType] = useState<LeaveType>('annual');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [name, setName] = useState('');
  const [reason, setReason] = useState('');

  const input = { type, start, end, name, reason };
  const base = leaveBase(input);
  const text = composeLeaveText(input);
  const timeError = leaveError(input);
  const duplicate = !!base && savedLeaves.some(saved => isSameLeave(saved, base));
  const canSubmit = !!text && !duplicate;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text || !canSubmit) return;
    onSubmit(text);
    setType('annual');
    setStart('');
    setEnd('');
    setName('');
    setReason('');
  }

  return (
    <form className="leave-form" onSubmit={handleSubmit}>
      <p className="leave-form__tit">이 날 연차·휴가 등록</p>

      <div className="leave-form__row">
        <label className="leave-form__field">
          <span className="leave-form__label">종류</span>
          <select className="leave-form__control" value={type} onChange={e => setType(e.target.value as LeaveType)}>
            {LEAVE_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>

        {type === 'hourly' && (
          <>
            <label className="leave-form__field">
              <span className="leave-form__label">시작 시각</span>
              <input className="leave-form__control" type="time" value={start} onChange={e => setStart(e.target.value)} />
            </label>
            <label className="leave-form__field">
              <span className="leave-form__label">종료 시각</span>
              <input className="leave-form__control" type="time" value={end} onChange={e => setEnd(e.target.value)} />
            </label>
          </>
        )}

        {type === 'custom' && (
          <label className="leave-form__field leave-form__field--grow">
            <span className="leave-form__label">휴가 이름</span>
            <input
              className="leave-form__control"
              type="text"
              placeholder="예: 병가, 경조사 휴가"
              value={name}
              onChange={e => setName(e.target.value)}
              autoComplete="off"
            />
          </label>
        )}
      </div>

      <label className="leave-form__field">
        <span className="leave-form__label">사유 (선택)</span>
        <input
          className="leave-form__control"
          type="text"
          placeholder="예: 병원 진료, 자녀 행사"
          value={reason}
          onChange={e => setReason(e.target.value)}
          autoComplete="off"
        />
      </label>

      <div className="leave-form__foot">
        <div className="leave-form__info" aria-live="polite">
          {timeError && <p className="leave-form__hint leave-form__hint--error">{timeError}</p>}
          {duplicate && <p className="leave-form__hint leave-form__hint--error">이 날 이미 같은 연차·휴가가 등록되어 있습니다.</p>}
          {text && !duplicate && (
            <p className="leave-form__hint">보고서에는 “{formatReportDate(date)} {text}”로 들어갑니다.</p>
          )}
        </div>
        <button type="submit" className="leave-form__btn" disabled={!canSubmit}>등록</button>
      </div>
    </form>
  );
}
