import type { LeaveType } from '../constants/labels';

// 연차·휴가의 이름·시각·사유를 보고서에 찍힐 한 줄(`연차 14:00~15:00 (병원 진료)`)로 합친다.
// 할 일의 제목 한 줄에 합쳐서 저장하므로 목록·완료 이력·백업·주간보고가 그대로 같이 쓴다.

export interface LeaveInput {
  type: LeaveType;
  start: string;  // 시간 연차의 시작 'HH:MM'
  end: string;    // 시간 연차의 종료 'HH:MM'
  name: string;   // 기타(병가 등)의 이름
  reason: string; // 사유 (선택)
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

// 사유를 뺀 이름 부분. 입력이 모자라거나 맞지 않으면 null.
export function leaveBase(input: LeaveInput): string | null {
  switch (input.type) {
    case 'annual': return '연차';
    case 'am': return '오전 반차';
    case 'pm': return '오후 반차';
    case 'hourly':
      return TIME.test(input.start) && TIME.test(input.end) && input.start < input.end
        ? `연차 ${input.start}~${input.end}`
        : null;
    case 'custom': {
      const name = input.name.replace(/\s+/g, ' ').trim();
      return name || null;
    }
  }
}

// 시간 연차에서 종료가 시작보다 늦지 않을 때의 안내. 문제가 없거나 아직 덜 입력했으면 null.
export function leaveError(input: LeaveInput): string | null {
  if (input.type !== 'hourly' || !TIME.test(input.start) || !TIME.test(input.end)) return null;
  return input.start < input.end ? null : '종료 시각은 시작 시각보다 늦어야 합니다.';
}

// 이름에 사유를 괄호로 붙인 최종 한 줄. 이름이 아직 정해지지 않았으면 null.
export function composeLeaveText(input: LeaveInput): string | null {
  const base = leaveBase(input);
  if (!base) return null;
  const reason = input.reason.replace(/\s*\n\s*/g, ' ').trim();
  return reason ? `${base} (${reason})` : base;
}

// 이미 저장된 제목이 같은 이름(사유만 다른 경우 포함)의 연차인지
export function isSameLeave(savedText: string, base: string): boolean {
  return savedText === base || savedText.startsWith(`${base} (`);
}

export interface LeaveStatus {
  /** 등록할 최종 제목 한 줄. 아직 덜 입력했으면 null */
  text: string | null;
  /** 시간 연차의 시각 안내 (문제가 없으면 null) */
  timeError: string | null;
  /** 그날 이미 같은 이름의 연차가 있는지 */
  duplicate: boolean;
  canSubmit: boolean;
}

// 입력 폼이 보여 줄 안내와 등록 가능 여부를 한 번에 계산한다. savedLeaves는 그날 이미 등록된 연차·휴가의 제목들.
export function leaveStatus(input: LeaveInput, savedLeaves: string[]): LeaveStatus {
  const base = leaveBase(input);
  const text = composeLeaveText(input);
  const duplicate = !!base && savedLeaves.some(saved => isSameLeave(saved, base));
  return { text, timeError: leaveError(input), duplicate, canSubmit: !!text && !duplicate };
}
