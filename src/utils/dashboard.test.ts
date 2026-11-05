import { describe, it, expect } from 'vitest';
import { buildDashboardStats } from './dashboard';
import type { Todo, CompletionLogEntry } from '../types/todo';

// 업체·업무 이름은 모두 가상의 이름이다. 오늘은 2026-11-04(수), 이번 주는 11/2(월)~11/8(일).
const TODAY = '2026-11-04';

function todo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: Math.random().toString(36).slice(2),
    text: '업무',
    completed: false,
    priority: 'medium',
    category: '기본',
    createdAt: '2026-10-20T09:00:00',
    ...overrides,
  };
}

function done(completedAt: string, overrides: Partial<Todo> = {}): Todo {
  return todo({ completed: true, completedAt, ...overrides });
}

function logEntry(completedAt: string, overrides: Partial<CompletionLogEntry> = {}): CompletionLogEntry {
  return { id: Math.random().toString(36).slice(2), text: '정리된 일', category: '기본', priority: 'medium', completedAt, ...overrides };
}

function stats(todos: Todo[] = [], completionLog: CompletionLogEntry[] = []) {
  return buildDashboardStats({ todos, completionLog, today: TODAY });
}

describe('buildDashboardStats — 주', () => {
  it('오늘이 속한 주(월~일)와 라벨', () => {
    const s = stats();
    expect(s.weekStart).toBe('2026-11-02');
    expect(s.weekEnd).toBe('2026-11-08');
    expect(s.weekLabel).toBe('11월 1주');
  });

  it('일요일에도 같은 주로 본다', () => {
    const s = buildDashboardStats({ todos: [], completionLog: [], today: '2026-11-08' });
    expect(s.weekStart).toBe('2026-11-02');
  });
});

describe('buildDashboardStats — 완료 수', () => {
  it('이번 주·지난주 완료 수를 센다 (연차는 제외, 완료 이력도 포함, 같은 id는 한 번)', () => {
    const s = stats(
      [
        done('2026-11-03T10:00:00'),
        done('2026-11-04T10:00:00', { kind: 'routine' }),
        done('2026-11-04T11:00:00', { kind: 'leave', dueDate: '2026-11-04' }), // 연차는 세지 않는다
        done('2026-10-28T10:00:00'),                                          // 지난주
        todo({ id: 'dup', completed: true, completedAt: '2026-11-05T10:00:00' }),
      ],
      [
        logEntry('2026-11-02T09:00:00'),                         // 이번 주 (정리된 이력)
        logEntry('2026-10-27T09:00:00'),                         // 지난주
        logEntry('2026-11-05T10:00:00', { id: 'dup' }),          // 위 'dup'과 같은 id → 한 번만
      ],
    );
    expect(s.completedThisWeek).toBe(4); // 11/3 일반, 11/4 정기, 11/5 dup, 11/2 이력
    expect(s.completedLastWeek).toBe(2); // 10/28 일반, 10/27 이력
  });

  it('주 경계: 일요일 밤은 이번 주, 월요일 0시는 다음 주', () => {
    const s = stats([
      done('2026-11-08T23:59:00'),
      done('2026-11-09T00:00:00'),
      done('2026-11-01T23:59:00'),
    ]);
    expect(s.completedThisWeek).toBe(1);
    expect(s.completedLastWeek).toBe(1);
  });

  it('완료하지 않은 일은 세지 않는다', () => {
    expect(stats([todo()]).completedThisWeek).toBe(0);
  });
});

describe('buildDashboardStats — 프로젝트별', () => {
  it('이번 주 완료한 일을 프로젝트별로 세고 많은 순, 같으면 이름순으로 정렬한다', () => {
    const s = stats([
      done('2026-11-03T10:00:00', { category: '다라시스템' }),
      done('2026-11-03T11:00:00', { category: '가나시청' }),
      done('2026-11-04T10:00:00', { category: '가나시청' }),
      done('2026-11-04T11:00:00', { category: '마바기관' }),
      done('2026-10-28T10:00:00', { category: '마바기관' }), // 지난주는 제외
      done('2026-11-04T12:00:00', { category: '  ' }),        // 비어 있으면 기본
    ]);
    expect(s.byCategory).toEqual([
      { category: '가나시청', count: 2 },
      { category: '기본', count: 1 },
      { category: '다라시스템', count: 1 },
      { category: '마바기관', count: 1 },
    ]);
  });
});

describe('buildDashboardStats — 추이', () => {
  it('최근 6주를 오래된 주부터 이번 주까지 돌려준다', () => {
    const s = stats([
      done('2026-11-03T10:00:00'),                         // 이번 주
      done('2026-10-28T10:00:00'),                         // 1주 전
      done('2026-10-29T10:00:00'),
      done('2026-10-14T10:00:00'),                         // 3주 전 (10/12 주)
      done('2026-09-30T10:00:00'),                         // 5주 전 (9/28 주)
      done('2026-09-20T10:00:00'),                         // 6주보다 더 전 → 범위 밖
    ]);
    expect(s.trend).toHaveLength(6);
    expect(s.trend.map(w => w.weekStart)).toEqual(['2026-09-28', '2026-10-05', '2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02']);
    expect(s.trend.map(w => w.count)).toEqual([1, 0, 1, 0, 2, 1]);
    expect(s.trend[5].label).toBe('11월 1주');
    expect(s.trend[0].label).toBe('9월 4주'); // 9/28은 9월의 네 번째 월요일
  });
});

describe('buildDashboardStats — 마감', () => {
  it('밀린 일은 마감이 오늘보다 앞선 미완료이고 오래된 순이다 (연차·완료·마감 없음 제외)', () => {
    const s = stats([
      todo({ id: 'b', text: '나중에 밀린', dueDate: '2026-11-03' }),
      todo({ id: 'a', text: '오래 밀린', dueDate: '2026-10-20', category: '가나시청' }),
      todo({ id: 'today', dueDate: TODAY }),                         // 오늘은 아직 밀린 게 아님
      done('2026-11-03T10:00:00', { dueDate: '2026-11-01' }),        // 완료
      todo({ kind: 'leave', dueDate: '2026-10-01' }),                // 연차
      todo({ dueDate: undefined }),                                  // 마감 없음
    ]);
    expect(s.overdue.map(t => t.id)).toEqual(['a', 'b']);
    expect(s.overdue[0]).toEqual({ id: 'a', text: '오래 밀린', category: '가나시청', dueDate: '2026-10-20' });
  });

  it('오늘 마감과 이번 주 남은 마감(오늘 이후~일요일)을 센다', () => {
    const s = stats([
      todo({ dueDate: TODAY }),
      todo({ dueDate: TODAY }),
      todo({ dueDate: '2026-11-05' }),
      todo({ dueDate: '2026-11-08' }),
      todo({ dueDate: '2026-11-09' }),                               // 다음 주
      todo({ dueDate: TODAY, completed: true, completedAt: '2026-11-04T09:00:00' }), // 완료
      todo({ dueDate: '2026-11-06', kind: 'leave' }),                // 연차
    ]);
    expect(s.dueToday).toBe(2);
    expect(s.dueThisWeek).toBe(2);
  });

  it('진행 중인 일 수에는 연차를 넣지 않는다', () => {
    const s = stats([todo(), todo(), todo({ kind: 'leave', dueDate: '2026-11-06' }), done('2026-11-03T10:00:00')]);
    expect(s.activeCount).toBe(2);
  });
});

describe('buildDashboardStats — 보고 누락 경고와 연차', () => {
  it('이번 주 마감인데 아직 안 한 정기 업무를 알려 준다', () => {
    const s = stats([
      todo({ id: 'r1', text: '바이러스 검사', kind: 'routine', dueDate: '2026-11-02' }), // 이번 주 월요일, 아직 안 함
      todo({ id: 'r2', text: '백업 점검', kind: 'routine', dueDate: '2026-11-06' }),
      todo({ kind: 'routine', dueDate: '2026-11-09' }),                                  // 다음 주
      todo({ kind: 'routine', dueDate: '2026-10-26' }),                                  // 지난주
      done('2026-11-03T10:00:00', { kind: 'routine', dueDate: '2026-11-03' }),           // 이미 함
      todo({ kind: 'task', dueDate: '2026-11-03' }),                                     // 일반 업무
    ]);
    expect(s.pendingRoutines.map(t => t.id)).toEqual(['r1', 'r2']);
  });

  it('이번 주 연차·휴가를 날짜순으로 돌려준다 (완료 여부와 상관없이)', () => {
    const s = stats([
      todo({ text: '오후 반차', kind: 'leave', dueDate: '2026-11-06' }),
      todo({ text: '연차', kind: 'leave', dueDate: '2026-11-03', completed: true }),
      todo({ text: '다음 주 연차', kind: 'leave', dueDate: '2026-11-10' }),
      todo({ text: '일반', dueDate: '2026-11-04' }),
    ]);
    expect(s.leaveThisWeek).toEqual([
      { date: '2026-11-03', text: '연차' },
      { date: '2026-11-06', text: '오후 반차' },
    ]);
  });

  it('kind가 없는 옛 데이터는 일반 업무로 본다', () => {
    const s = stats([todo({ kind: undefined, dueDate: '2026-10-30' })]);
    expect(s.overdue).toHaveLength(1);
    expect(s.pendingRoutines).toHaveLength(0);
  });
});

describe('buildDashboardStats — 빈 상태', () => {
  it('데이터가 없어도 모든 값이 0·빈 목록이다', () => {
    const s = stats();
    expect(s).toMatchObject({
      completedThisWeek: 0, completedLastWeek: 0, activeCount: 0, dueToday: 0, dueThisWeek: 0,
      byCategory: [], overdue: [], pendingRoutines: [], leaveThisWeek: [],
    });
    expect(s.trend.every(w => w.count === 0)).toBe(true);
  });
});
