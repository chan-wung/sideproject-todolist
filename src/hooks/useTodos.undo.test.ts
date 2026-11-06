import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';
import { useTodos } from './useTodos';

// 실행취소는 "방금 한 삭제"만 되살려야 한다. 그 뒤에 한 추가·수정이 같이 사라지면 안 된다.
describe('useTodos 실행취소 범위', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  function setup() {
    return renderHook(() => useTodos());
  }

  function add(hook: ReturnType<typeof setup>, text: string) {
    act(() => { hook.result.current.addTodo(text, 'medium', '', ''); });
    return hook.result.current.allTodos.find(t => t.text === text)!.id;
  }

  const texts = (hook: ReturnType<typeof setup>) => hook.result.current.allTodos.map(t => t.text);

  it('A 삭제 → B 추가 → 실행취소: A가 돌아오고 B도 남는다', () => {
    const hook = setup();
    const a = add(hook, 'A');
    act(() => { hook.result.current.deleteTodo(a); });
    add(hook, 'B');

    act(() => { hook.result.current.performUndo(); });

    expect(texts(hook).sort()).toEqual(['A', 'B']);
  });

  it('A 삭제 → B 수정 → 실행취소: B의 수정 내용이 남는다', () => {
    const hook = setup();
    const a = add(hook, 'A');
    const b = add(hook, 'B');
    act(() => { hook.result.current.deleteTodo(a); });
    act(() => { hook.result.current.updateTodo(b, { text: 'B 수정' }); });

    act(() => { hook.result.current.performUndo(); });

    expect(texts(hook).sort()).toEqual(['A', 'B 수정']);
  });

  it('삭제한 항목은 원래 자리로 돌아온다', () => {
    const hook = setup();
    add(hook, 'C');
    const b = add(hook, 'B');
    add(hook, 'A'); // 목록: A, B, C
    act(() => { hook.result.current.deleteTodo(b); });

    act(() => { hook.result.current.performUndo(); });

    expect(texts(hook)).toEqual(['A', 'B', 'C']);
  });

  it('완료 항목 삭제 → 완료 이력 한 건 삭제 → 실행취소: 지운 이력은 되살아나지 않는다', () => {
    const hook = setup();
    const x = add(hook, 'X');
    const y = add(hook, 'Y');
    act(() => { hook.result.current.toggleTodo(x); });
    act(() => { hook.result.current.toggleTodo(y); });
    act(() => { hook.result.current.deleteTodo(x); });
    act(() => { hook.result.current.dismissUndo(); });
    act(() => { hook.result.current.deleteTodo(y); });
    const logX = hook.result.current.completionLog.find(e => e.id === x)!;
    act(() => { hook.result.current.deleteCompletionLogEntry(logX); });

    act(() => { hook.result.current.performUndo(); });

    expect(texts(hook)).toEqual(['Y']);
    expect(hook.result.current.completionLog).toEqual([]);
  });

  it('하위 항목 삭제 → 다른 할 일 수정 → 실행취소: 하위 항목만 돌아온다', () => {
    const hook = setup();
    const p = add(hook, 'P');
    const q = add(hook, 'Q');
    act(() => { hook.result.current.addSubtask(p, 's1'); });
    act(() => { hook.result.current.addSubtask(p, 's2'); });
    const s1 = hook.result.current.allTodos.find(t => t.id === p)!.subtasks![0].id;
    act(() => { hook.result.current.deleteSubtask(p, s1); });
    act(() => { hook.result.current.updateTodo(q, { text: 'Q 수정' }); });

    act(() => { hook.result.current.performUndo(); });

    const parent = hook.result.current.allTodos.find(t => t.id === p)!;
    expect(parent.subtasks!.map(s => s.text)).toEqual(['s1', 's2']);
    expect(texts(hook)).toContain('Q 수정');
  });

  it('연속 삭제: 실행취소는 마지막 삭제만 되살리고, 안내가 새로 갱신된다', () => {
    const hook = setup();
    const a = add(hook, 'A');
    const b = add(hook, 'B');
    act(() => { hook.result.current.deleteTodo(a); });
    const firstId = hook.result.current.undoId;
    act(() => { hook.result.current.deleteTodo(b); });
    expect(hook.result.current.undoId).not.toBe(firstId);

    act(() => { hook.result.current.performUndo(); });

    expect(texts(hook)).toEqual(['B']);
    expect(hook.result.current.undoMessage).toBeNull();
  });

  it('초기화한 뒤에는 이전 삭제를 실행취소할 수 없다', () => {
    const hook = setup();
    const a = add(hook, 'A');
    act(() => { hook.result.current.deleteTodo(a); });
    act(() => { hook.result.current.resetTodos(); });
    expect(hook.result.current.undoMessage).toBeNull();

    act(() => { hook.result.current.performUndo(); });

    expect(texts(hook)).toEqual([]);
  });

  it('가져오기 뒤에는 이전 삭제를 실행취소할 수 없다', () => {
    const hook = setup();
    const a = add(hook, 'A');
    act(() => { hook.result.current.deleteTodo(a); });
    act(() => { hook.result.current.importData([]); });
    expect(hook.result.current.undoMessage).toBeNull();

    act(() => { hook.result.current.performUndo(); });

    expect(texts(hook)).toEqual([]);
  });

  it('완료된 항목 일괄 삭제를 되돌려도 남은 항목은 그대로다', () => {
    const hook = setup();
    const a = add(hook, 'A');
    add(hook, 'B');
    act(() => { hook.result.current.toggleTodo(a); });
    act(() => { hook.result.current.clearCompleted(); });
    add(hook, 'C');

    act(() => { hook.result.current.performUndo(); });

    expect(texts(hook).sort()).toEqual(['A', 'B', 'C']);
    expect(hook.result.current.completionLog).toEqual([]);
  });
});
