// 할 일 입력창에서 종류를 '연차·휴가'로 골랐을 때의 동작 (연차 입력칸·날짜·등록)
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup, within } from '@testing-library/react';
import TodoInput from './TodoInput';

function setup(leaveTitlesOn: (date: string) => string[] = () => []) {
  const onAdd = vi.fn();
  const utils = render(<TodoInput onAdd={onAdd} categories={[]} leaveTitlesOn={leaveTitlesOn} />);
  const choose = (value: string) => fireEvent.change(utils.getByLabelText('연차 종류'), { target: { value } });
  const pickDate = (day: number) => {
    fireEvent.click(utils.getByRole('button', { name: '날짜' }));
    const dropdown = utils.container.querySelector('.date-picker__dropdown') as HTMLElement;
    fireEvent.click(within(dropdown).getByRole('button', { name: String(day) }));
  };
  const add = () => fireEvent.click(utils.getByRole('button', { name: '추가' }));
  const reason = () => utils.getByLabelText('사유 (선택)') as HTMLInputElement;
  const toLeave = () => fireEvent.change(utils.getByLabelText('종류'), { target: { value: 'leave' } });
  return { ...utils, onAdd, choose, pickDate, add, reason, toLeave };
}

describe('TodoInput — 연차·휴가 등록', () => {
  afterEach(() => cleanup());

  it('종류를 연차·휴가로 고르면 글 입력칸 대신 연차 입력칸이 나온다', () => {
    const { toLeave, queryByPlaceholderText, getByLabelText } = setup();
    expect(queryByPlaceholderText(/크게 할 일을 입력하세요/)).not.toBeNull();
    toLeave();
    expect(queryByPlaceholderText(/크게 할 일을 입력하세요/)).toBeNull();
    const type = getByLabelText('연차 종류') as HTMLSelectElement;
    expect(type.value).toBe('annual');
    expect(Array.from(type.options).map(o => o.textContent)).toEqual(['연차', '오전 반차', '오후 반차', '시간 연차', '기타']);
  });

  it('날짜를 안 골랐으면 등록하지 않고 안내한다', () => {
    const { toLeave, add, onAdd, getAllByText } = setup();
    toLeave();
    add();
    expect(onAdd).not.toHaveBeenCalled();
    expect(getAllByText('연차·휴가는 날짜를 선택해 주세요.').length).toBeGreaterThan(0);
  });

  it('날짜를 고르고 추가하면 연차를 그 날짜로 등록하고, 폼을 일반 할 일 상태로 되돌린다', () => {
    const { toLeave, pickDate, add, onAdd, queryByPlaceholderText, getByText } = setup();
    toLeave();
    pickDate(6);
    expect(getByText(/보고서에는 “\d{4}\.\d{1,2}\.6 연차”로 들어갑니다\./)).toBeTruthy();
    add();
    expect(onAdd).toHaveBeenCalledTimes(1);
    const [text, priority, due, category, recurrence, kind, start] = onAdd.mock.calls[0];
    expect([text, priority, category, recurrence, kind, start]).toEqual(['연차', 'medium', '', 'none', 'leave', '']);
    expect(due.endsWith('-06')).toBe(true);
    expect(queryByPlaceholderText(/크게 할 일을 입력하세요/)).not.toBeNull();
  });

  it('종류를 고르는 것만으로는 등록되지 않는다 (추가 버튼을 눌러야 한다)', () => {
    const { toLeave, choose, pickDate, onAdd } = setup();
    toLeave();
    pickDate(6);
    choose('am');
    choose('pm');
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('사유를 적으면 이름과 합쳐 한 줄로 등록한다', () => {
    const { toLeave, choose, pickDate, reason, add, onAdd, getByText } = setup();
    toLeave();
    pickDate(6);
    choose('pm');
    fireEvent.change(reason(), { target: { value: '  자녀 행사  ' } });
    expect(getByText(/오후 반차 \(자녀 행사\)”로 들어갑니다\./)).toBeTruthy();
    add();
    expect(onAdd.mock.calls[0][0]).toBe('오후 반차 (자녀 행사)');
  });

  it('시간 연차를 고를 때만 시작·종료 시각 칸이 나온다', () => {
    const { toLeave, choose, queryByLabelText } = setup();
    toLeave();
    expect(queryByLabelText('시작 시각')).toBeNull();
    choose('hourly');
    expect(queryByLabelText('시작 시각')).not.toBeNull();
    expect(queryByLabelText('종료 시각')).not.toBeNull();
    choose('annual');
    expect(queryByLabelText('종료 시각')).toBeNull();
  });

  it('시간 연차는 시각을 모두 넣어야 등록되고, 시간 범위와 사유가 함께 들어간다 (1시간도 가능)', () => {
    const { toLeave, choose, pickDate, reason, add, onAdd, getByLabelText, getAllByText } = setup();
    toLeave();
    pickDate(6);
    choose('hourly');
    add();
    expect(onAdd).not.toHaveBeenCalled();
    expect(getAllByText('연차·휴가 내용을 입력해 주세요.').length).toBeGreaterThan(0);

    fireEvent.change(getByLabelText('시작 시각'), { target: { value: '14:00' } });
    fireEvent.change(getByLabelText('종료 시각'), { target: { value: '15:00' } });
    fireEvent.change(reason(), { target: { value: '병원 진료' } });
    add();
    expect(onAdd.mock.calls[0][0]).toBe('연차 14:00~15:00 (병원 진료)');
  });

  it('종료 시각이 시작 시각보다 늦지 않으면 안내하고 등록하지 않는다', () => {
    const { toLeave, choose, pickDate, add, onAdd, getByLabelText, getAllByText } = setup();
    toLeave();
    pickDate(6);
    choose('hourly');
    fireEvent.change(getByLabelText('시작 시각'), { target: { value: '15:00' } });
    fireEvent.change(getByLabelText('종료 시각'), { target: { value: '14:00' } });
    expect(getAllByText('종료 시각은 시작 시각보다 늦어야 합니다.').length).toBeGreaterThan(0);
    add();
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('기타를 고를 때만 이름 칸이 나오고, 이름이 있어야 등록한다', () => {
    const { toLeave, choose, pickDate, reason, add, onAdd, queryByLabelText, getByLabelText } = setup();
    toLeave();
    pickDate(6);
    expect(queryByLabelText('휴가 이름')).toBeNull();
    choose('custom');
    fireEvent.change(getByLabelText('휴가 이름'), { target: { value: '   ' } });
    add();
    expect(onAdd).not.toHaveBeenCalled();

    fireEvent.change(getByLabelText('휴가 이름'), { target: { value: '병가' } });
    fireEvent.change(reason(), { target: { value: '독감' } });
    add();
    expect(onAdd.mock.calls[0][0]).toBe('병가 (독감)');
  });

  it('그날 같은 이름이 이미 있으면(사유가 달라도) 안내하고 등록하지 않는다', () => {
    const leaveTitlesOn = vi.fn((date: string) => (date.endsWith('-06') ? ['연차 (병원 진료)'] : []));
    const { toLeave, choose, pickDate, add, onAdd, getByText } = setup(leaveTitlesOn);
    toLeave();
    pickDate(6);
    expect(getByText('이 날 이미 같은 연차·휴가가 등록되어 있습니다.')).toBeTruthy();
    add();
    expect(onAdd).not.toHaveBeenCalled();

    choose('am'); // 다른 이름은 가능
    add();
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd.mock.calls[0][0]).toBe('오전 반차');
  });

  it('하루 연차가 있어도 시간 연차는 따로 등록할 수 있다', () => {
    const { toLeave, choose, pickDate, add, onAdd, getByLabelText } = setup(() => ['연차']);
    toLeave();
    pickDate(6);
    choose('hourly');
    fireEvent.change(getByLabelText('시작 시각'), { target: { value: '14:00' } });
    fireEvent.change(getByLabelText('종료 시각'), { target: { value: '15:00' } });
    add();
    expect(onAdd.mock.calls[0][0]).toBe('연차 14:00~15:00');
  });

  it('연차는 시작일을 쓰지 않고 반복도 하지 않는다', () => {
    const { toLeave, pickDate, add, onAdd } = setup();
    toLeave();
    pickDate(6);
    add();
    const [, , , , recurrence, kind, start] = onAdd.mock.calls[0];
    expect([recurrence, kind, start]).toEqual(['none', 'leave', '']);
  });
});
