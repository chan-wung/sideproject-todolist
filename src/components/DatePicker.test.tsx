// DatePicker·DateRangePicker 리팩터링(달력 공통부 분리) 전에 현재 동작을 고정하는 특성화 테스트.
// 분리 후에도 이 파일을 수정하지 않고 모두 통과해야 한다.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import DatePicker from './DatePicker';
import DateRangePicker from './DateRangePicker';

// 2026-11-04(수)로 고정. 2026-11-01은 일요일이라 11월 앞 빈칸이 0개, 12월은 화요일 시작이라 2개.
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-04T10:00:00'));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const dayButtons = (c: HTMLElement, block: string) => Array.from(c.querySelectorAll<HTMLButtonElement>(`.${block}__cell--day`));
const dayButton = (c: HTMLElement, block: string, day: number) => dayButtons(c, block).find(b => b.textContent === String(day))!;
const monthLabel = (c: HTMLElement, block: string) => c.querySelector(`.${block}__month`)?.textContent;

describe('DatePicker', () => {
  function setup(value = '') {
    const onChange = vi.fn();
    const utils = render(<DatePicker value={value} onChange={onChange} />);
    const open = () => fireEvent.click(utils.container.querySelector('.date-picker__input') as HTMLElement);
    return { ...utils, onChange, open };
  }

  it('값이 없으면 안내 문구를, 있으면 값을 보여 주고 처음엔 닫혀 있다', () => {
    const empty = setup();
    expect(empty.getByText('마감일 선택')).toBeTruthy();
    expect(empty.container.querySelector('.date-picker__dropdown')).toBeNull();
    cleanup();

    const filled = setup('2026-11-10');
    expect(filled.getByText('2026-11-10')).toBeTruthy();
  });

  it('누르면 열리고(aria-expanded), 지금 달의 달력과 요일 머리글을 보여 준다', () => {
    const { container, open } = setup();
    const trigger = container.querySelector('.date-picker__input') as HTMLElement;
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    open();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(monthLabel(container, 'date-picker')).toBe('2026년 11월');
    expect(Array.from(container.querySelectorAll('.date-picker__cell--head')).map(e => e.textContent)).toEqual(['일', '월', '화', '수', '목', '금', '토']);
    expect(dayButtons(container, 'date-picker')).toHaveLength(30);
    expect(container.querySelectorAll('.date-picker__cell--empty')).toHaveLength(0);
  });

  it('값이 있으면 그 값의 달로 열리고, 오늘과 선택한 날을 표시한다', () => {
    const { container, open } = setup('2025-03-10');
    open();
    expect(monthLabel(container, 'date-picker')).toBe('2025년 3월');
    expect(dayButton(container, 'date-picker', 10).className).toContain('date-picker__cell--selected');
    expect(container.querySelectorAll('.date-picker__cell--selected')).toHaveLength(1);
    expect(container.querySelectorAll('.date-picker__cell--today')).toHaveLength(0); // 오늘은 2026-11-04
  });

  it('오늘 칸에 today 표시가 붙는다', () => {
    const { container, open } = setup();
    open();
    expect(dayButton(container, 'date-picker', 4).className).toContain('date-picker__cell--today');
    expect(container.querySelectorAll('.date-picker__cell--today')).toHaveLength(1);
  });

  it('이전·다음 달로 이동하고 앞 빈칸·일수가 달에 맞는다', () => {
    const { container, getByLabelText, open } = setup();
    open();
    fireEvent.click(getByLabelText('다음 달'));
    expect(monthLabel(container, 'date-picker')).toBe('2026년 12월');
    expect(container.querySelectorAll('.date-picker__cell--empty')).toHaveLength(2);
    expect(dayButtons(container, 'date-picker')).toHaveLength(31);

    fireEvent.click(getByLabelText('이전 달'));
    fireEvent.click(getByLabelText('이전 달'));
    expect(monthLabel(container, 'date-picker')).toBe('2026년 10월');
    expect(dayButtons(container, 'date-picker')).toHaveLength(31);
  });

  it('해가 바뀌는 이동과 윤년 2월을 처리한다', () => {
    const jan = setup('2026-01-15');
    jan.open();
    fireEvent.click(jan.getByLabelText('이전 달'));
    expect(monthLabel(jan.container, 'date-picker')).toBe('2025년 12월');
    cleanup();

    const feb = setup('2028-02-01');
    feb.open();
    expect(dayButtons(feb.container, 'date-picker')).toHaveLength(29);
  });

  it('날짜를 누르면 YYYY-MM-DD로 알리고 닫는다', () => {
    const { container, onChange, open } = setup();
    open();
    fireEvent.click(dayButton(container, 'date-picker', 5));
    expect(onChange).toHaveBeenCalledWith('2026-11-05');
    expect(container.querySelector('.date-picker__dropdown')).toBeNull();
  });

  it('초기화 버튼은 값이 있을 때만 보이고, 누르면 빈 값을 알리되 달력은 열지 않는다', () => {
    const empty = setup();
    expect(empty.container.querySelector('.date-picker__clear')).toBeNull();
    cleanup();

    const { container, getByLabelText, onChange } = setup('2026-11-10');
    fireEvent.click(getByLabelText('초기화'));
    expect(onChange).toHaveBeenCalledWith('');
    expect(container.querySelector('.date-picker__dropdown')).toBeNull();
  });

  it('바깥을 누르면 닫힌다', () => {
    const { container, open } = setup();
    open();
    expect(container.querySelector('.date-picker__dropdown')).not.toBeNull();
    fireEvent.mouseDown(document.body);
    expect(container.querySelector('.date-picker__dropdown')).toBeNull();
  });
});

describe('DateRangePicker', () => {
  function setup(startValue = '', endValue = '') {
    const onChange = vi.fn();
    const utils = render(<DateRangePicker startValue={startValue} endValue={endValue} onChange={onChange} />);
    const open = () => fireEvent.click(utils.container.querySelector('.date-range-picker__input') as HTMLElement);
    return { ...utils, onChange, open };
  }
  const B = 'date-range-picker';
  const cls = (c: HTMLElement, day: number) => dayButton(c, B, day).className;

  it('값이 없으면 안내 문구를, 둘 다 있으면 "시작 ~ 종료"를 보여 준다', () => {
    const empty = setup();
    expect(empty.getByText('기간 선택')).toBeTruthy();
    cleanup();

    const filled = setup('2026-11-02', '2026-11-08');
    expect(filled.getByText('2026-11-02 ~ 2026-11-08')).toBeTruthy();
  });

  it('시작일만 있으면(하루짜리) 그 날짜 하나를 보여 준다', () => {
    const single = setup('2026-11-02', '');
    expect(single.getByText('2026-11-02')).toBeTruthy();
  });

  it('지금 달의 달력과 요일 머리글, 시작일 안내를 보여 준다', () => {
    const { container, getByText, open } = setup();
    open();
    expect(monthLabel(container, B)).toBe('2026년 11월');
    expect(Array.from(container.querySelectorAll(`.${B}__cell--head`)).map(e => e.textContent)).toEqual(['일', '월', '화', '수', '목', '금', '토']);
    expect(dayButtons(container, B)).toHaveLength(30);
    expect(getByText('시작일을 선택하세요')).toBeTruthy();
    expect(cls(container, 4)).toContain(`${B}__cell--today`);
  });

  it('시작값의 달로 열리고, 시작값이 없으면 종료값의 달로 연다', () => {
    const a = setup('2025-03-10', '2025-03-12');
    a.open();
    expect(monthLabel(a.container, B)).toBe('2025년 3월');
    cleanup();

    const b = setup('', '2025-07-01');
    b.open();
    expect(monthLabel(b.container, B)).toBe('2025년 7월');
  });

  it('이전·다음 달 이동과 앞 빈칸·일수, 해 넘김, 윤년을 처리한다', () => {
    const { container, getByLabelText, open } = setup();
    open();
    fireEvent.click(getByLabelText('다음 달'));
    expect(monthLabel(container, B)).toBe('2026년 12월');
    expect(container.querySelectorAll(`.${B}__cell--empty`)).toHaveLength(2);
    expect(dayButtons(container, B)).toHaveLength(31);
    cleanup();

    const jan = setup('2026-01-15', '2026-01-20');
    jan.open();
    fireEvent.click(jan.getByLabelText('이전 달'));
    expect(monthLabel(jan.container, B)).toBe('2025년 12월');
    cleanup();

    const feb = setup('2028-02-01', '2028-02-02');
    feb.open();
    expect(dayButtons(feb.container, B)).toHaveLength(29);
  });

  it('확정된 범위를 시작·끝·사이로 표시한다', () => {
    const { container, open } = setup('2026-11-03', '2026-11-06');
    open();
    expect(cls(container, 3)).toContain(`${B}__cell--range-start`);
    expect(cls(container, 6)).toContain(`${B}__cell--range-end`);
    expect(cls(container, 4)).toContain(`${B}__cell--in-range`);
    expect(cls(container, 5)).toContain(`${B}__cell--in-range`);
    expect(cls(container, 2)).not.toContain('in-range');
    expect(cls(container, 7)).not.toContain('in-range');
    expect(container.querySelectorAll(`.${B}__cell--in-range`)).toHaveLength(4);
  });

  it('시작일을 누르면 "시작, 빈 종료"로 알리고 열린 채 종료일을 기다린다', () => {
    const { container, getByText, onChange, open } = setup();
    open();
    fireEvent.click(dayButton(container, B, 10));
    expect(onChange).toHaveBeenLastCalledWith('2026-11-10', '');
    expect(container.querySelector(`.${B}__dropdown`)).not.toBeNull();
    expect(getByText('종료일을 선택하세요 (하루만이면 같은 날을 다시 누르세요)')).toBeTruthy();
    expect(getByText('2026-11-10 ~ 종료일 선택')).toBeTruthy();
  });

  it('종료일을 누르면 범위를 알리고 닫는다 (먼저 누른 날보다 이르면 순서를 바꿔 알린다)', () => {
    const later = setup();
    later.open();
    fireEvent.click(dayButton(later.container, B, 10));
    fireEvent.click(dayButton(later.container, B, 14));
    expect(later.onChange).toHaveBeenLastCalledWith('2026-11-10', '2026-11-14');
    expect(later.container.querySelector(`.${B}__dropdown`)).toBeNull();
    cleanup();

    const earlier = setup();
    earlier.open();
    fireEvent.click(dayButton(earlier.container, B, 10));
    fireEvent.click(dayButton(earlier.container, B, 5));
    expect(earlier.onChange).toHaveBeenLastCalledWith('2026-11-05', '2026-11-10');
  });

  it('시작일을 고른 뒤 마우스를 올린 날까지 범위를 미리 보여 준다', () => {
    const { container, open } = setup();
    open();
    fireEvent.click(dayButton(container, B, 10));
    fireEvent.mouseEnter(dayButton(container, B, 14));
    expect(cls(container, 10)).toContain(`${B}__cell--range-start`);
    expect(cls(container, 14)).toContain(`${B}__cell--range-end`);
    expect(cls(container, 12)).toContain(`${B}__cell--in-range`);
    expect(cls(container, 16)).not.toContain('in-range');

    // 시작보다 앞쪽에 올려도 범위가 뒤집혀 보인다
    fireEvent.mouseEnter(dayButton(container, B, 7));
    expect(cls(container, 7)).toContain(`${B}__cell--range-start`);
    expect(cls(container, 10)).toContain(`${B}__cell--range-end`);
  });

  it('시작일만 고르고 열고 닫으면 처음부터 다시 고르게 된다', () => {
    const { container, getByText, open } = setup();
    open();
    fireEvent.click(dayButton(container, B, 10));
    fireEvent.click(container.querySelector(`.${B}__input`) as HTMLElement); // 닫기
    open(); // 다시 열기
    expect(getByText('시작일을 선택하세요')).toBeTruthy();
  });

  it('초기화 버튼은 값이 있을 때만 보이고, 누르면 빈 값 둘을 알린다', () => {
    const empty = setup();
    expect(empty.container.querySelector(`.${B}__clear`)).toBeNull();
    cleanup();

    const { container, getByLabelText, onChange } = setup('2026-11-02', '2026-11-08');
    fireEvent.click(getByLabelText('초기화'));
    expect(onChange).toHaveBeenCalledWith('', '');
    expect(container.querySelector(`.${B}__dropdown`)).toBeNull();
  });

  it('바깥을 누르면 닫히고 고르던 시작일도 버린다', () => {
    const { container, getByText, open } = setup();
    open();
    fireEvent.click(dayButton(container, B, 10));
    fireEvent.mouseDown(document.body);
    expect(container.querySelector(`.${B}__dropdown`)).toBeNull();
    open();
    expect(getByText('시작일을 선택하세요')).toBeTruthy();
  });
});
