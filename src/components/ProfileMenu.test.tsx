import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import ProfileMenu from './ProfileMenu';

function setup(overrides: Partial<React.ComponentProps<typeof ProfileMenu>> = {}) {
  const handlers = {
    onNameChange: vi.fn(),
    onExport: vi.fn(),
    onImport: vi.fn(),
    onRecurrenceOpen: vi.fn(),
    onCompletionLogOpen: vi.fn(),
    onSettingsOpen: vi.fn(),
  };
  const utils = render(<ProfileMenu placement="nav" name="" {...handlers} {...overrides} />);
  const button = utils.getByRole('button', { name: /이름 입력|님/ });
  const box = () => utils.container.querySelector('.profile-menu__box') as HTMLElement;
  return { ...utils, ...handlers, button, box };
}

describe('ProfileMenu', () => {
  afterEach(() => cleanup());

  it('처음에는 닫혀 있고, 버튼을 누르면 열리고 aria-expanded가 바뀐다', () => {
    const { button, box } = setup();
    expect(box().hidden).toBe(true);
    expect(button.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(button);
    expect(box().hidden).toBe(false);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(button);
    expect(box().hidden).toBe(true);
  });

  it('Esc를 누르거나 바깥을 누르면 닫힌다', () => {
    const { button, box } = setup();
    fireEvent.click(button);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(box().hidden).toBe(true);

    fireEvent.click(button);
    fireEvent.mouseDown(document.body);
    expect(box().hidden).toBe(true);
  });

  it('이름이 없으면 "이름 입력", 있으면 "○○ 님"과 첫 글자를 보여 준다', () => {
    const empty = setup();
    expect(empty.button.textContent).toContain('이름 입력');
    cleanup();

    const named = setup({ name: ' 김하나 ' });
    expect(named.button.textContent).toContain('김하나 님');
    expect(named.container.querySelector('.profile-menu__initial')?.textContent).toBe('김');
  });

  it('이름 칸에 입력하면 onNameChange가 불린다', () => {
    const { button, getByLabelText, onNameChange } = setup();
    fireEvent.click(button);
    fireEvent.change(getByLabelText('이름'), { target: { value: '김하나' } });
    expect(onNameChange).toHaveBeenCalledWith('김하나');
  });

  it.each([
    ['내보내기', 'onExport'],
    ['반복 일정', 'onRecurrenceOpen'],
    ['완료 이력', 'onCompletionLogOpen'],
    ['설정', 'onSettingsOpen'],
  ] as const)('%s 항목을 누르면 동작하고 메뉴가 닫힌다', (label, handler) => {
    const utils = setup();
    fireEvent.click(utils.button);
    fireEvent.click(utils.getByRole('button', { name: label }));
    expect(utils[handler]).toHaveBeenCalledTimes(1);
    expect(utils.box().hidden).toBe(true);
  });

  it('가져오기는 파일을 고르면 onImport에 파일을 넘기고 메뉴를 닫는다', () => {
    const { button, container, box, onImport } = setup();
    fireEvent.click(button);
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['{}'], 'backup.json', { type: 'application/json' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(onImport).toHaveBeenCalledWith(file);
    expect(box().hidden).toBe(true);
  });

  it('접힌 사이드바는 collapsed 클래스를 갖는다', () => {
    const { container } = setup({ collapsed: true });
    expect(container.querySelector('.profile-menu--nav.profile-menu--collapsed')).not.toBeNull();
  });
});
