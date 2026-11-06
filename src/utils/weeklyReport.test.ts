import { describe, it, expect } from 'vitest';
import { buildWeeklyReport, shiftWeek, hasUnreportedWeek } from './weeklyReport';
import type { Todo, CompletionLogEntry } from '../types/todo';

// 테스트 데이터의 업체·시스템 이름은 모두 가상의 이름이다.
const WEEK = '2026-11-02'; // 월요일

function done(overrides: Partial<Todo> = {}): Todo {
  return {
    id: Math.random().toString(36).slice(2),
    text: '업무',
    completed: true,
    priority: 'medium',
    category: '기본',
    createdAt: '2026-10-30T09:00:00',
    completedAt: '2026-11-03T10:00:00',
    ...overrides,
  };
}

function logEntry(overrides: Partial<CompletionLogEntry> = {}): CompletionLogEntry {
  return {
    id: Math.random().toString(36).slice(2),
    text: '업무',
    category: '기본',
    priority: 'medium',
    completedAt: '2026-11-03T10:00:00',
    ...overrides,
  };
}

function build(todos: Todo[] = [], completionLog: CompletionLogEntry[] = [], weekStart = WEEK) {
  return buildWeeklyReport({ weekStart, todos, completionLog });
}

describe('buildWeeklyReport — 양식', () => {
  it('날짜 줄(정기 업무·연차), 빈 줄, [프로젝트] 줄 순서로 만든다', () => {
    const report = build([
      done({ id: 'r', text: '바이러스 검사', kind: 'routine', completedAt: '2026-11-02T09:00:00' }),
      done({ id: 'l', text: '연차', kind: 'leave', completed: false, completedAt: undefined, dueDate: '2026-11-04' }),
      done({ id: 'a', text: '유지보수(홈페이지 수정요청)', category: '가나시청', completedAt: '2026-11-03T11:00:00' }),
      done({ id: 'b', text: '수정사항 수정', category: '다라시스템', completedAt: '2026-11-03T15:00:00' }),
    ]);
    expect(report.text).toBe([
      '2026.11.2 바이러스 검사 완료',
      '2026.11.4 연차',
      '',
      '[가나시청] 유지보수(홈페이지 수정요청)',
      '[다라시스템] 수정사항 수정',
    ].join('\n'));
    expect(report.label).toBe('11월 1주');
    expect(report.weekEnd).toBe('2026-11-08');
    expect(report.isEmpty).toBe(false);
  });

  it('한쪽만 있으면 빈 줄을 넣지 않는다', () => {
    const onlyDated = build([done({ text: '점검', kind: 'routine' })]);
    expect(onlyDated.text).toBe('2026.11.3 점검 완료');

    const onlyTasks = build([done({ text: '작업', category: '가나시청' })]);
    expect(onlyTasks.text).toBe('[가나시청] 작업');
  });

  it('이번 주에 한 일이 없으면 비어 있다', () => {
    const report = build([]);
    expect(report.isEmpty).toBe(true);
    expect(report.text).toBe('');
  });
});

describe('buildWeeklyReport — 일반 업무', () => {
  it('같은 프로젝트·내용은 한 줄로 합치고, 먼저 완료한 순서로 둔다', () => {
    const report = build([
      done({ text: '유지보수', category: '가나시청', completedAt: '2026-11-05T10:00:00' }),
      done({ text: '메인 수정', category: '다라시스템', completedAt: '2026-11-03T10:00:00' }),
      done({ text: '유지보수', category: '가나시청', completedAt: '2026-11-04T10:00:00' }),
    ]);
    expect(report.projectLines).toEqual(['[다라시스템] 메인 수정', '[가나시청] 유지보수']);
  });

  it('프로젝트가 기본이거나 비어 있으면 대괄호를 붙이지 않는다', () => {
    const report = build([
      done({ text: '기본 업무', category: '기본', completedAt: '2026-11-03T10:00:00' }),
      done({ text: '빈 프로젝트', category: '  ', completedAt: '2026-11-03T11:00:00' }),
    ]);
    expect(report.projectLines).toEqual(['기본 업무', '빈 프로젝트']);
  });

  it('여러 줄로 쓴 제목은 한 줄로 이어 붙인다', () => {
    const report = build([done({ text: '첫 줄\n  둘째 줄', category: '가나시청' })]);
    expect(report.projectLines).toEqual(['[가나시청] 첫 줄 둘째 줄']);
  });

  it('완료하지 않은 일은 넣지 않는다', () => {
    const report = build([done({ text: '아직', completed: false, completedAt: undefined })]);
    expect(report.isEmpty).toBe(true);
  });
});

describe('buildWeeklyReport — 정기 업무', () => {
  it('제목이 이미 "완료"로 끝나면 "완료"를 또 붙이지 않는다', () => {
    const report = build([done({ text: '바이러스 검사 완료', kind: 'routine' })]);
    expect(report.dateLines).toEqual(['2026.11.3 바이러스 검사 완료']);
  });

  it('완료하지 않은 정기 업무는 넣지 않는다', () => {
    const report = build([done({ kind: 'routine', completed: false, completedAt: undefined })]);
    expect(report.isEmpty).toBe(true);
  });
});

describe('buildWeeklyReport — 연차·휴가', () => {
  it('완료 체크를 안 해도 날짜가 그 주에 있으면 넣고, 다른 주는 뺀다', () => {
    const report = build([
      done({ text: '연차', kind: 'leave', completed: false, completedAt: undefined, dueDate: '2026-11-06' }),
      done({ text: '반차', kind: 'leave', completed: false, completedAt: undefined, dueDate: '2026-11-09' }),
    ]);
    expect(report.dateLines).toEqual(['2026.11.6 연차']);
  });

  it('날짜가 없는 연차는 넣지 않는다', () => {
    const report = build([done({ text: '연차', kind: 'leave', completed: false, completedAt: undefined })]);
    expect(report.isEmpty).toBe(true);
  });

  it('완료 이력으로 정리된 연차도 이력에 남긴 날짜로 넣는다', () => {
    const report = build([], [logEntry({ text: '오후 반차', kind: 'leave', dueDate: '2026-11-05', completedAt: '2026-11-20T09:00:00' })]);
    expect(report.dateLines).toEqual(['2026.11.5 오후 반차']);
  });
});

describe('buildWeeklyReport — 주 경계와 출처', () => {
  it('일요일 23시 59분은 그 주, 월요일 0시는 다음 주다', () => {
    const todos = [
      done({ id: 'prev', text: '지난주 일요일', completedAt: '2026-11-01T23:59:00' }),
      done({ id: 'sun', text: '일요일 밤', completedAt: '2026-11-08T23:59:00' }),
      done({ id: 'mon', text: '다음주 월요일', completedAt: '2026-11-09T00:00:00' }),
    ];
    expect(build(todos).projectLines).toEqual(['일요일 밤']);
    expect(build(todos, [], '2026-11-09').projectLines).toEqual(['다음주 월요일']);
  });

  it('완료 이력에서도 가져오고, 같은 id는 한 번만 센다', () => {
    const report = build(
      [done({ id: 'same', text: '같은 일', category: '가나시청' })],
      [
        logEntry({ id: 'same', text: '같은 일', category: '가나시청' }),
        logEntry({ id: 'old', text: '정리된 일', category: '가나시청', completedAt: '2026-11-04T10:00:00' }),
      ],
    );
    expect(report.projectLines).toEqual(['[가나시청] 같은 일', '[가나시청] 정리된 일']);
  });

  it('완료 시각이 UTC(Z)여도 로컬 날짜로 센다', () => {
    // 로컬 기준 2026-11-03 00:30 → toISOString()은 시간대에 따라 전날 UTC가 될 수 있다.
    const completedAt = new Date(2026, 10, 3, 0, 30).toISOString();
    const report = build([done({ text: '자정 직후', kind: 'routine', completedAt })]);
    expect(report.dateLines).toEqual(['2026.11.3 자정 직후 완료']);
  });

  it('날짜 줄은 날짜순으로 정렬한다', () => {
    const report = build([
      done({ text: '점검', kind: 'routine', completedAt: '2026-11-05T09:00:00' }),
      done({ text: '연차', kind: 'leave', completed: false, completedAt: undefined, dueDate: '2026-11-03' }),
    ]);
    expect(report.dateLines).toEqual(['2026.11.3 연차', '2026.11.5 점검 완료']);
  });
});

describe('buildWeeklyReport — 하위 항목', () => {
  const sub = (text: string, completed = true) => ({ id: Math.random().toString(36).slice(2), text, completed });

  it('하위 항목은 제목 아래에 "- 내용" 줄로 이어 붙인다 (일반 업무·정기 업무 모두)', () => {
    const report = build([
      done({ id: 'r', text: '바이러스 검사', kind: 'routine', completedAt: '2026-11-02T09:00:00', subtasks: [sub('사무실 PC'), sub('서버실')] }),
      done({ id: 'a', text: '유지보수', category: '가나시청', subtasks: [sub('메인 배너 교체'), sub('게시판 오류 수정')] }),
    ]);
    expect(report.text).toBe([
      '2026.11.2 바이러스 검사 완료',
      '- 사무실 PC',
      '- 서버실',
      '',
      '[가나시청] 유지보수',
      '- 메인 배너 교체',
      '- 게시판 오류 수정',
    ].join('\n'));
  });

  it('하위 항목이 없는 일은 지금처럼 한 줄이다', () => {
    expect(build([done({ text: '작업', category: '가나시청' })]).text).toBe('[가나시청] 작업');
  });

  it('완료 이력의 하위 항목도 가져온다', () => {
    const report = build([], [logEntry({ text: '정리된 일', category: '가나시청', subtasks: [{ text: '첫째', completed: true }] })]);
    expect(report.projectLines).toEqual(['[가나시청] 정리된 일\n- 첫째']);
  });

  it('같은 일이 여러 번이면 한 덩어리로 합치고 하위 항목은 겹치지 않게 모은다', () => {
    const report = build([
      done({ id: 'a', text: '유지보수', category: '가나시청', completedAt: '2026-11-03T10:00:00', subtasks: [sub('배너'), sub('게시판')] }),
      done({ id: 'b', text: '유지보수', category: '가나시청', completedAt: '2026-11-04T10:00:00', subtasks: [sub('게시판'), sub('팝업')] }),
    ]);
    expect(report.projectLines).toEqual(['[가나시청] 유지보수\n- 배너\n- 게시판\n- 팝업']);
  });

  it('하위 항목의 줄바꿈과 빈 항목은 정리한다', () => {
    const report = build([done({ text: '작업', subtasks: [sub('둘로\n나뉨'), sub('   ')] })]);
    expect(report.projectLines).toEqual(['작업\n- 둘로 나뉨']);
  });

  it('includeSubtasks를 끄면 제목 줄만 만든다 (같은 일은 여전히 한 줄로 합침)', () => {
    const todos = [
      done({ id: 'a', text: '유지보수', category: '가나시청', subtasks: [sub('배너')] }),
      done({ id: 'b', text: '유지보수', category: '가나시청', completedAt: '2026-11-04T10:00:00', subtasks: [sub('팝업')] }),
    ];
    const report = buildWeeklyReport({ weekStart: WEEK, todos, completionLog: [], includeSubtasks: false });
    expect(report.projectLines).toEqual(['[가나시청] 유지보수']);
    expect(report.text).toBe('[가나시청] 유지보수');
  });

  it('연차 줄에는 하위 항목을 붙이지 않는다', () => {
    const report = build([done({ text: '연차', kind: 'leave', completed: false, completedAt: undefined, dueDate: '2026-11-04', subtasks: [sub('메모')] })]);
    expect(report.dateLines).toEqual(['2026.11.4 연차']);
  });
});

describe('shiftWeek', () => {
  it('주 단위로 이동한다', () => {
    expect(shiftWeek('2026-11-02', 1)).toBe('2026-11-09');
    expect(shiftWeek('2026-11-02', -1)).toBe('2026-10-26');
    expect(shiftWeek('2026-11-02', 0)).toBe('2026-11-02');
  });
});

describe('hasUnreportedWeek', () => {
  const base = { weekStart: WEEK, todos: [] as Todo[], completionLog: [] as CompletionLogEntry[], drafts: {} as Record<string, string>, copiedWeeks: [] as string[] };

  it('완료한 일이 있고 아직 복사하지 않았으면 미보고다', () => {
    expect(hasUnreportedWeek({ ...base, todos: [done()] })).toBe(true);
  });

  it('이미 복사한 주는 미보고가 아니다', () => {
    expect(hasUnreportedWeek({ ...base, todos: [done()], copiedWeeks: [WEEK] })).toBe(false);
  });

  it('완료한 일도 직접 쓴 글도 없으면 미보고가 아니다', () => {
    expect(hasUnreportedWeek(base)).toBe(false);
    expect(hasUnreportedWeek({ ...base, drafts: { [WEEK]: '   ' } })).toBe(false);
  });

  it('자동 생성 글이 비어 있어도 직접 쓴 글이 있으면 미보고다', () => {
    expect(hasUnreportedWeek({ ...base, drafts: { [WEEK]: '직접 쓴 보고' } })).toBe(true);
  });

  it('다른 주의 저장본·복사 기록은 영향을 주지 않는다', () => {
    expect(hasUnreportedWeek({ ...base, drafts: { '2026-11-09': '다음 주 글' }, copiedWeeks: ['2026-10-26'] })).toBe(false);
  });
});
