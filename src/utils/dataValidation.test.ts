import { describe, it, expect } from 'vitest';
import { validateTodos, validateCompletionLog } from './todoData';
import { validateRecurrenceSeries } from './recurrence';
import { validateMemos } from './memoData';
import { validateWeeklyReportData } from './weeklyReportData';

const todo = (over: Record<string, unknown> = {}) => ({ id: 'a', text: 't', completed: false, priority: 'medium', category: '기본', createdAt: '2026-11-01T00:00:00.000Z', ...over });
const series = (over: Record<string, unknown> = {}) => ({ id: 's', text: 't', frequency: 'daily', anchorDate: '2026-11-01', ...over });

describe('저장 데이터 검증: 손상은 전체 거부, 옛 데이터는 허용 (R02·R07)', () => {
  it('정상 구형 데이터(선택 필드 없음)는 통과한다', () => {
    expect(validateTodos([{ id: 'a', text: 't' }])).toHaveLength(1);
    expect(validateTodos([todo({ subtasks: [{ id: 's1', text: 'x' }] })])?.[0].subtasks).toEqual([{ id: 's1', text: 'x', completed: false }]);
    expect(validateRecurrenceSeries([series()])).toHaveLength(1);
  });

  it.each([
    ['할 일 ID 중복', () => validateTodos([todo(), todo({ text: 'other' })])],
    ['하위 항목 ID 중복', () => validateTodos([todo({ subtasks: [{ id: 's', text: 'a', completed: false }, { id: 's', text: 'b', completed: false }] })])],
    ['하위 항목 completed가 문자열', () => validateTodos([todo({ subtasks: [{ id: 's', text: 'a', completed: 'false' }] })])],
    ['모양이 틀린 하위 항목', () => validateTodos([todo({ subtasks: [{ id: 's' }] })])],
    ['읽을 수 없는 createdAt', () => validateTodos([todo({ createdAt: 'yesterday' })])],
    ['읽을 수 없는 completedAt', () => validateTodos([todo({ completedAt: 'nope' })])],
    ['완료 이력 completedAt 손상', () => validateCompletionLog([{ id: 'a', text: 't', completedAt: 'nope' }])],
    ['완료 이력 하위 항목 completed가 문자열', () => validateCompletionLog([{ id: 'a', text: 't', completedAt: '2026-11-01T00:00:00Z', subtasks: [{ text: 'x', completed: 'no' }] }])],
    ['없는 날짜 anchorDate', () => validateRecurrenceSeries([series({ anchorDate: '2026-02-30' })])],
    ['손상된 lastMaterializedDate', () => validateRecurrenceSeries([series({ lastMaterializedDate: 'broken' })])],
    ['손상된 endDate', () => validateRecurrenceSeries([series({ endDate: '2026-13-01' })])],
    ['시리즈 ID 중복', () => validateRecurrenceSeries([series(), series({ text: 'other' })])],
    ['메모 ID 중복', () => validateMemos([{ id: 'm', title: '', content: '' }, { id: 'm', title: '', content: '' }])],
    ['화요일 주 키(draft)', () => validateWeeklyReportData({ drafts: { '2026-11-03': 'x' }, copiedWeeks: [] })],
    ['화요일 주 키(복사 기록)', () => validateWeeklyReportData({ drafts: {}, copiedWeeks: ['2026-11-03'] })],
  ])('%s → 거부(null)', (_name, run) => {
    expect(run()).toBeNull();
  });

  it('월요일 주 키는 통과한다', () => {
    expect(validateWeeklyReportData({ drafts: { '2026-11-02': 'x' }, copiedWeeks: ['2026-11-02'] })).not.toBeNull();
  });
});
