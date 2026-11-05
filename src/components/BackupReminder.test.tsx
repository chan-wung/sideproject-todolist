import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, fireEvent, cleanup } from '@testing-library/react';
import BackupReminder from './BackupReminder';

describe('BackupReminder', () => {
  afterEach(() => cleanup());

  it('안내 문구와 두 버튼을 보여 주고, 누르면 각각 알린다', () => {
    const onExport = vi.fn();
    const onSnooze = vi.fn();
    const { getByRole, getByText } = render(
      <BackupReminder message="마지막 백업이 8일 전입니다." onExport={onExport} onSnooze={onSnooze} />,
    );
    expect(getByRole('status')).toBeTruthy();
    expect(getByText('마지막 백업이 8일 전입니다.')).toBeTruthy();

    fireEvent.click(getByRole('button', { name: '지금 내보내기' }));
    expect(onExport).toHaveBeenCalledTimes(1);
    expect(onSnooze).not.toHaveBeenCalled();

    fireEvent.click(getByRole('button', { name: '내일 다시 알림' }));
    expect(onSnooze).toHaveBeenCalledTimes(1);
  });
});
