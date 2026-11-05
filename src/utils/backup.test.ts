import { describe, it, expect } from 'vitest';
import { backupReminder, backupFileName, BACKUP_INTERVAL_DAYS } from './backup';

const TODAY = '2026-11-04';

function remind(overrides: Partial<Parameters<typeof backupReminder>[0]> = {}) {
  return backupReminder({ lastBackup: null, snoozedOn: null, hasData: true, today: TODAY, ...overrides });
}

describe('backupReminder', () => {
  it('데이터가 없으면 알리지 않는다', () => {
    expect(remind({ hasData: false }).show).toBe(false);
    expect(remind({ hasData: false, lastBackup: '2026-01-01' }).show).toBe(false);
  });

  it('한 번도 백업하지 않았으면 알린다', () => {
    const r = remind({ lastBackup: null });
    expect(r.show).toBe(true);
    expect(r.message).toContain('백업한 적이 없습니다');
  });

  it('마지막 백업이 7일 이상 지났으면 며칠 전인지 알린다', () => {
    const r = remind({ lastBackup: '2026-10-28' }); // 7일 전
    expect(BACKUP_INTERVAL_DAYS).toBe(7);
    expect(r.show).toBe(true);
    expect(r.message).toContain('7일 전');
    expect(remind({ lastBackup: '2026-10-01' }).message).toContain('34일 전');
  });

  it('7일이 안 됐으면 알리지 않는다 (6일 전까지)', () => {
    expect(remind({ lastBackup: '2026-10-29' }).show).toBe(false); // 6일 전
    expect(remind({ lastBackup: TODAY }).show).toBe(false);        // 오늘
  });

  it('마지막 백업 날짜가 미래(시계 어긋남)여도 알리지 않는다', () => {
    expect(remind({ lastBackup: '2026-11-20' }).show).toBe(false);
  });

  it('"내일 다시 알림"을 누른 날에는 알리지 않고, 다음 날부터 다시 알린다', () => {
    expect(remind({ snoozedOn: TODAY }).show).toBe(false);
    expect(remind({ lastBackup: '2026-10-01', snoozedOn: TODAY }).show).toBe(false);
    expect(remind({ lastBackup: '2026-10-01', snoozedOn: '2026-11-03' }).show).toBe(true);
  });

  it('달·해를 넘겨도 날짜 차이가 맞다', () => {
    expect(backupReminder({ lastBackup: '2026-12-25', snoozedOn: null, hasData: true, today: '2027-01-02' }).show).toBe(true); // 8일
    expect(backupReminder({ lastBackup: '2026-12-28', snoozedOn: null, hasData: true, today: '2027-01-02' }).show).toBe(false); // 5일
  });
});

describe('backupFileName', () => {
  it('날짜를 붙여 파일 이름을 만든다', () => {
    expect(backupFileName('2026-11-04')).toBe('todolist-backup-20261104.json');
    expect(backupFileName('2027-01-02')).toBe('todolist-backup-20270102.json');
  });
});
