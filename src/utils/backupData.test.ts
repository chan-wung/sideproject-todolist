import { describe, it, expect } from 'vitest';
import { parseBackup } from './backupData';

// 업무·업체 이름은 모두 가상의 이름이다.
const TODO = { id: 't1', text: '유지보수', completed: false, priority: 'high', category: '가나시청', createdAt: '2026-11-01T09:00:00', dueDate: '2026-11-10', kind: 'routine' };
const MEMO = { id: 'm1', title: '서버 계정', content: '아이디: test' };
const LOG = { id: 'l1', text: '연차', category: '기본', priority: 'medium', completedAt: '2026-11-03T10:00:00', kind: 'leave', dueDate: '2026-11-04' };
const SERIES = { id: 's1', text: '바이러스 검사', category: '기본', priority: 'medium', frequency: 'weekly', anchorDate: '2026-11-02', kind: 'routine', status: 'active', createdAt: '2026-10-30T09:00:00' };

describe('parseBackup', () => {
  it('새 형식: 주간보고 저장본을 포함한 다섯 구역을 모두 읽는다', () => {
    const weeklyReports = { drafts: { '2026-11-02': '직접 고친 보고서' }, copiedWeeks: ['2026-11-02'] };
    const parsed = parseBackup({ version: 1, todos: [TODO], memos: [MEMO], completionLog: [LOG], recurrenceSeries: [SERIES], weeklyReports });
    expect(parsed).not.toBeNull();
    expect(parsed!.todos![0]).toMatchObject({ id: 't1', kind: 'routine', dueDate: '2026-11-10' });
    expect(parsed!.memos).toEqual([MEMO]);
    expect(parsed!.completionLog![0]).toMatchObject({ id: 'l1', kind: 'leave', dueDate: '2026-11-04' });
    expect(parsed!.recurrenceSeries![0]).toMatchObject({ id: 's1', kind: 'routine', frequency: 'weekly' });
    expect(parsed!.weeklyReports).toEqual(weeklyReports);
  });

  it('파일에 있는 구역만 돌려준다 (없는 구역은 건드리지 않게 비워 둔다)', () => {
    const onlyMemos = parseBackup({ memos: [MEMO] });
    expect(onlyMemos).toEqual({ memos: [MEMO] });
    expect('todos' in onlyMemos!).toBe(false);

    const noMemos = parseBackup({ todos: [TODO] });
    expect(noMemos!.todos).toHaveLength(1);
    expect(noMemos!.memos).toBeUndefined();
  });

  it('빈 배열 구역도 "있는 구역"이다 (그 데이터를 비우는 백업)', () => {
    expect(parseBackup({ todos: [] })).toEqual({ todos: [] });
    expect(parseBackup({ memos: [], completionLog: [] })).toEqual({ memos: [], completionLog: [] });
  });

  it('예전 형식(할 일 배열만)도 읽는다', () => {
    const parsed = parseBackup([{ id: 'old', text: '옛 할 일' }]);
    expect(parsed).not.toBeNull();
    expect(parsed!.todos![0]).toMatchObject({ id: 'old', text: '옛 할 일', priority: 'medium', category: '기본', kind: 'task' });
    expect(Object.keys(parsed!)).toEqual(['todos']);
  });

  it('종류(kind)가 없거나 잘못된 옛 데이터는 일반 업무로 읽고, 형식이 맞는 값은 그대로 둔다', () => {
    const parsed = parseBackup({
      todos: [{ id: 'a', text: 'a' }, { id: 'b', text: 'b', kind: 'vacation' }, { id: 'c', text: 'c', kind: 'leave' }],
      completionLog: [{ id: 'x', text: 'x', completedAt: '2026-11-01T00:00:00' }],
    });
    expect(parsed!.todos!.map(t => t.kind)).toEqual(['task', 'task', 'leave']);
    expect(parsed!.completionLog![0].kind).toBe('task');
    expect(parsed!.completionLog![0].dueDate).toBeUndefined();
  });

  it('한 구역이라도 틀리면 전체를 거부한다 (나머지가 멀쩡해도)', () => {
    expect(parseBackup({ todos: [TODO], memos: [{ id: 'm', title: 1 }] })).toBeNull();
    expect(parseBackup({ todos: [{ noId: true }], memos: [MEMO] })).toBeNull();
    expect(parseBackup({ todos: [TODO], completionLog: [{ id: 'l', text: 't' }] })).toBeNull(); // completedAt 없음
    expect(parseBackup({ todos: [TODO], recurrenceSeries: [{ id: 's', text: 't', frequency: 'hourly', anchorDate: '2026-11-01' }] })).toBeNull();
    expect(parseBackup({ todos: [TODO], weeklyReports: { drafts: { wrong: 1 }, copiedWeeks: [] } })).toBeNull();
  });

  it('구역 값이 배열이 아니면 거부한다', () => {
    expect(parseBackup({ todos: 'x' })).toBeNull();
    expect(parseBackup({ memos: {} })).toBeNull();
    expect(parseBackup({ completionLog: 1 })).toBeNull();
    expect(parseBackup({ recurrenceSeries: null })).toBeNull();
  });

  it('알려진 구역이 하나도 없으면 거부한다', () => {
    expect(parseBackup({})).toBeNull();
    expect(parseBackup({ version: 1 })).toBeNull();
    expect(parseBackup({ something: [1, 2] })).toBeNull();
  });

  it('객체·배열이 아닌 값은 거부한다', () => {
    expect(parseBackup(null)).toBeNull();
    expect(parseBackup(undefined)).toBeNull();
    expect(parseBackup('백업')).toBeNull();
    expect(parseBackup(42)).toBeNull();
    expect(parseBackup(true)).toBeNull();
  });

  it('내보낸 JSON을 다시 읽어도 같다 (왕복)', () => {
    const exported = JSON.parse(JSON.stringify({ version: 1, todos: [TODO], memos: [MEMO], completionLog: [LOG], recurrenceSeries: [SERIES] }));
    const first = parseBackup(exported);
    const second = parseBackup(JSON.parse(JSON.stringify({ version: 1, ...first })));
    expect(second).toEqual(first);
  });
});
