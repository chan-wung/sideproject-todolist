import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import type { ComponentProps } from 'react';
import LeaveForm from './LeaveForm';

function setup(props: Partial<ComponentProps<typeof LeaveForm>> = {}) {
  const onSubmit = vi.fn();
  const utils = render(<LeaveForm date="2026-11-06" savedLeaves={[]} onSubmit={onSubmit} {...props} />);
  const type = () => utils.getByLabelText('종류') as HTMLSelectElement;
  const reason = () => utils.getByLabelText('사유 (선택)') as HTMLInputElement;
  const submit = () => utils.getByRole('button', { name: '등록' }) as HTMLButtonElement;
  const choose = (value: string) => fireEvent.change(type(), { target: { value } });
  return { ...utils, onSubmit, type, reason, submit, choose };
}

describe('LeaveForm', () => {
  afterEach(() => cleanup());

  it('처음엔 연차가 골라져 있고, 사유 없이도 한 번에 등록한다', () => {
    const { type, submit, onSubmit, getByText } = setup();
    expect(type().value).toBe('annual');
    expect(Array.from(type().options).map(o => o.textContent)).toEqual(['연차', '오전 반차', '오후 반차', '시간 연차', '기타']);
    expect(getByText('보고서에는 “2026.11.6 연차”로 들어갑니다.')).toBeTruthy();
    fireEvent.click(submit());
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith('연차');
  });

  it('종류를 고르는 것만으로는 등록되지 않는다 (등록 버튼을 눌러야 한다)', () => {
    const { choose, onSubmit } = setup();
    choose('am');
    choose('pm');
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('사유를 적으면 이름과 합쳐 한 줄로 등록하고, 등록 뒤에는 폼을 비운다', () => {
    const { choose, reason, type, submit, onSubmit, getByText } = setup();
    choose('pm');
    fireEvent.change(reason(), { target: { value: '  자녀 행사  ' } });
    expect(getByText('보고서에는 “2026.11.6 오후 반차 (자녀 행사)”로 들어갑니다.')).toBeTruthy();
    fireEvent.click(submit());
    expect(onSubmit).toHaveBeenCalledWith('오후 반차 (자녀 행사)');
    expect(reason().value).toBe('');
    expect(type().value).toBe('annual');
  });

  it('시간 연차를 고를 때만 시작·종료 시각 칸이 나온다', () => {
    const { choose, queryByLabelText } = setup();
    expect(queryByLabelText('시작 시각')).toBeNull();
    expect(queryByLabelText('종료 시각')).toBeNull();
    choose('hourly');
    expect(queryByLabelText('시작 시각')).not.toBeNull();
    expect(queryByLabelText('종료 시각')).not.toBeNull();
    choose('annual');
    expect(queryByLabelText('시작 시각')).toBeNull();
  });

  it('시간 연차는 시각을 모두 넣어야 등록할 수 있고, 시간 범위와 사유가 함께 들어간다 (1시간도 가능)', () => {
    const { choose, reason, submit, onSubmit, getByLabelText } = setup();
    choose('hourly');
    expect(submit().disabled).toBe(true);

    fireEvent.change(getByLabelText('시작 시각'), { target: { value: '14:00' } });
    expect(submit().disabled).toBe(true); // 종료가 아직 없다

    fireEvent.change(getByLabelText('종료 시각'), { target: { value: '15:00' } });
    expect(submit().disabled).toBe(false);

    fireEvent.change(reason(), { target: { value: '병원 진료' } });
    fireEvent.click(submit());
    expect(onSubmit).toHaveBeenCalledWith('연차 14:00~15:00 (병원 진료)');
  });

  it('종료 시각이 시작 시각보다 늦지 않으면 안내하고 등록을 막는다', () => {
    const { choose, submit, onSubmit, getByLabelText, getByText } = setup();
    choose('hourly');
    fireEvent.change(getByLabelText('시작 시각'), { target: { value: '15:00' } });
    fireEvent.change(getByLabelText('종료 시각'), { target: { value: '14:00' } });
    expect(getByText('종료 시각은 시작 시각보다 늦어야 합니다.')).toBeTruthy();
    expect(submit().disabled).toBe(true);
    fireEvent.click(submit());
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('기타를 고를 때만 이름 칸이 나오고, 이름이 있어야 등록한다', () => {
    const { choose, reason, submit, onSubmit, queryByLabelText, getByLabelText } = setup();
    expect(queryByLabelText('휴가 이름')).toBeNull();
    choose('custom');
    expect(submit().disabled).toBe(true);

    fireEvent.change(getByLabelText('휴가 이름'), { target: { value: '   ' } });
    expect(submit().disabled).toBe(true);

    fireEvent.change(getByLabelText('휴가 이름'), { target: { value: '병가' } });
    fireEvent.change(reason(), { target: { value: '독감' } });
    fireEvent.click(submit());
    expect(onSubmit).toHaveBeenCalledWith('병가 (독감)');
  });

  it('그날 같은 이름이 이미 있으면(사유가 달라도) 안내하고 등록을 막는다', () => {
    const { choose, submit, onSubmit, getByText } = setup({ savedLeaves: ['연차 (병원 진료)'] });
    expect(getByText('이 날 이미 같은 연차·휴가가 등록되어 있습니다.')).toBeTruthy();
    expect(submit().disabled).toBe(true);
    fireEvent.click(submit());
    expect(onSubmit).not.toHaveBeenCalled();

    choose('am'); // 다른 이름은 가능
    expect(submit().disabled).toBe(false);
  });

  it('하루 연차가 있어도 시간 연차는 따로 등록할 수 있다', () => {
    const { choose, submit, getByLabelText } = setup({ savedLeaves: ['연차'] });
    choose('hourly');
    fireEvent.change(getByLabelText('시작 시각'), { target: { value: '14:00' } });
    fireEvent.change(getByLabelText('종료 시각'), { target: { value: '15:00' } });
    expect(submit().disabled).toBe(false);
  });
});
