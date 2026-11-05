import { describe, it, expect } from 'vitest';
import { leaveBase, leaveError, composeLeaveText, isSameLeave, leaveStatus, type LeaveInput } from './leave';

function input(overrides: Partial<LeaveInput> = {}): LeaveInput {
  return { type: 'annual', start: '', end: '', name: '', reason: '', ...overrides };
}

describe('leaveBase', () => {
  it('연차·오전 반차·오후 반차는 고정 이름이다', () => {
    expect(leaveBase(input({ type: 'annual' }))).toBe('연차');
    expect(leaveBase(input({ type: 'am' }))).toBe('오전 반차');
    expect(leaveBase(input({ type: 'pm' }))).toBe('오후 반차');
  });

  it('시간 연차는 시작~종료 시각이 모두 맞을 때만 이름을 만든다 (1시간도 가능)', () => {
    expect(leaveBase(input({ type: 'hourly', start: '14:00', end: '15:00' }))).toBe('연차 14:00~15:00');
    expect(leaveBase(input({ type: 'hourly', start: '09:30', end: '18:00' }))).toBe('연차 09:30~18:00');
    expect(leaveBase(input({ type: 'hourly', start: '14:00', end: '' }))).toBeNull();
    expect(leaveBase(input({ type: 'hourly', start: '', end: '' }))).toBeNull();
  });

  it('시간 연차: 종료가 시작보다 늦지 않거나 시각 형식이 아니면 만들지 않는다', () => {
    expect(leaveBase(input({ type: 'hourly', start: '15:00', end: '15:00' }))).toBeNull();
    expect(leaveBase(input({ type: 'hourly', start: '15:00', end: '14:00' }))).toBeNull();
    expect(leaveBase(input({ type: 'hourly', start: '25:00', end: '26:00' }))).toBeNull();
    expect(leaveBase(input({ type: 'hourly', start: '9:00', end: '10:00' }))).toBeNull();
  });

  it('기타는 입력한 이름(공백 정리)을 쓰고, 비어 있으면 null이다', () => {
    expect(leaveBase(input({ type: 'custom', name: '  병가  ' }))).toBe('병가');
    expect(leaveBase(input({ type: 'custom', name: '경조사   휴가' }))).toBe('경조사 휴가');
    expect(leaveBase(input({ type: 'custom', name: '   ' }))).toBeNull();
  });
});

describe('leaveError', () => {
  it('시간 연차에서 종료가 시작보다 늦지 않을 때만 안내한다', () => {
    expect(leaveError(input({ type: 'hourly', start: '15:00', end: '14:00' }))).toContain('종료 시각');
    expect(leaveError(input({ type: 'hourly', start: '15:00', end: '15:00' }))).toContain('종료 시각');
    expect(leaveError(input({ type: 'hourly', start: '14:00', end: '15:00' }))).toBeNull();
    expect(leaveError(input({ type: 'hourly', start: '14:00', end: '' }))).toBeNull(); // 아직 덜 입력
    expect(leaveError(input({ type: 'annual' }))).toBeNull();
  });
});

describe('composeLeaveText', () => {
  it('사유가 없으면 이름만, 있으면 괄호로 붙인다', () => {
    expect(composeLeaveText(input())).toBe('연차');
    expect(composeLeaveText(input({ reason: '병원 진료' }))).toBe('연차 (병원 진료)');
    expect(composeLeaveText(input({ type: 'pm', reason: '자녀 행사' }))).toBe('오후 반차 (자녀 행사)');
    expect(composeLeaveText(input({ type: 'hourly', start: '14:00', end: '15:00', reason: '병원 진료' }))).toBe('연차 14:00~15:00 (병원 진료)');
    expect(composeLeaveText(input({ type: 'custom', name: '병가', reason: '독감' }))).toBe('병가 (독감)');
  });

  it('사유의 앞뒤 공백·줄바꿈은 정리하고, 공백뿐이면 붙이지 않는다', () => {
    expect(composeLeaveText(input({ reason: '  병원\n진료  ' }))).toBe('연차 (병원 진료)');
    expect(composeLeaveText(input({ reason: '   ' }))).toBe('연차');
  });

  it('이름을 아직 못 정하면 null이다', () => {
    expect(composeLeaveText(input({ type: 'hourly', start: '14:00' }))).toBeNull();
    expect(composeLeaveText(input({ type: 'custom', name: '' }))).toBeNull();
  });
});

describe('isSameLeave', () => {
  it('사유만 다른 같은 이름은 같은 연차로 본다', () => {
    expect(isSameLeave('연차', '연차')).toBe(true);
    expect(isSameLeave('연차 (병원 진료)', '연차')).toBe(true);
    expect(isSameLeave('연차 14:00~15:00 (병원 진료)', '연차 14:00~15:00')).toBe(true);
  });

  it('다른 이름이나 다른 시각은 다른 연차다', () => {
    expect(isSameLeave('오전 반차', '연차')).toBe(false);
    expect(isSameLeave('연차 14:00~15:00', '연차')).toBe(false); // 하루 연차와 시간 연차는 다르다
    expect(isSameLeave('연차 15:00~16:00', '연차 14:00~15:00')).toBe(false);
    expect(isSameLeave('연차휴가', '연차')).toBe(false);
  });
});

describe('leaveStatus', () => {
  it('입력이 갖춰지면 등록할 제목과 등록 가능 여부를 알려 준다', () => {
    expect(leaveStatus(input({ reason: '병원' }), [])).toEqual({ text: '연차 (병원)', timeError: null, duplicate: false, canSubmit: true });
  });

  it('덜 입력했으면 등록할 수 없다 (기타는 이름, 시간 연차는 시각이 필요)', () => {
    expect(leaveStatus(input({ type: 'custom' }), []).canSubmit).toBe(false);
    expect(leaveStatus(input({ type: 'hourly', start: '14:00' }), []).canSubmit).toBe(false);
  });

  it('종료가 시작보다 늦지 않으면 안내 문구와 함께 등록할 수 없다', () => {
    const s = leaveStatus(input({ type: 'hourly', start: '15:00', end: '14:00' }), []);
    expect(s.timeError).toBe('종료 시각은 시작 시각보다 늦어야 합니다.');
    expect(s.canSubmit).toBe(false);
  });

  it('그날 같은 이름이 있으면(사유가 달라도) 중복이라 등록할 수 없다', () => {
    const s = leaveStatus(input(), ['연차 (병원 진료)']);
    expect(s.duplicate).toBe(true);
    expect(s.canSubmit).toBe(false);
    expect(leaveStatus(input({ type: 'am' }), ['연차 (병원 진료)']).canSubmit).toBe(true);
  });
});
