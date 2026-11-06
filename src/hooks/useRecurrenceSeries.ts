import { useState, useEffect, useCallback, useRef } from 'react';
import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { Todo, RecurrenceSeries, RecurrenceFrequency, TodoKind } from '../types/todo';
import { todayStr } from '../utils/date';
import { materializeDueOccurrences, validateRecurrenceSeries } from '../utils/recurrence';
import { generateId } from '../utils/id';
import { normalizeKind } from '../utils/kind';
import { readStorage, writeStorage } from '../utils/storage';
import { useDayChange } from './useDayChange';
import { SERIES_KEY } from '../constants/storageKeys';

const SERIES_STORAGE_KEY = SERIES_KEY;

// 반복 시리즈 상태와 저장, 도래한 회차 생성(materialize), 시리즈 규칙 CRUD.
// 회차는 할 일 목록에 추가되므로 todos의 최신값(ref)과 setTodos를 받는다.
// 시리즈와 할 일을 함께 바꾸는 작업(승격·삭제·초기화·앱 시작 마이그레이션)은 useTodos가 맡는다.
export function useRecurrenceSeries(
  todosRef: MutableRefObject<Todo[]>,
  setTodos: Dispatch<SetStateAction<Todo[]>>,
) {
  const [recurrenceSeries, setRecurrenceSeries] = useState<RecurrenceSeries[]>(() => readStorage(SERIES_STORAGE_KEY, validateRecurrenceSeries, []));
  const recurrenceSeriesRef = useRef(recurrenceSeries);
  recurrenceSeriesRef.current = recurrenceSeries;

  useEffect(() => { writeStorage(SERIES_STORAGE_KEY, recurrenceSeries); }, [recurrenceSeries]);

  // materializeDueOccurrences 결과를 상태에 반영하는 공통 처리.
  // alwaysPersistSeries: 방금 새 시리즈를 추가해 목록 자체가 이미 바뀐 경우 true
  //   (미래 기준일이라 이번엔 생성할 회차가 없어도 시리즈는 저장돼야 함).
  const applyMaterialize = useCallback((seriesList: RecurrenceSeries[], alwaysPersistSeries = false) => {
    const { newTodos, nextSeries, changed } = materializeDueOccurrences(seriesList, todosRef.current, todayStr());
    if (changed || alwaysPersistSeries) setRecurrenceSeries(nextSeries);
    // 같은 회차(seriesId + dueDate)는 한 번만 넣는다. focus·visibility·자정 알림이 잇따라 와도 중복 생성되지 않는다.
    if (newTodos.length > 0) {
      setTodos(prev => {
        const fresh = newTodos.filter(n => !prev.some(t => t.seriesId === n.seriesId && t.dueDate === n.dueDate));
        return fresh.length > 0 ? [...fresh, ...prev] : prev;
      });
    }
  }, [todosRef, setTodos]);

  // 자정이 지났을 때도 같은 함수로 회차를 만든다 (탭 복귀는 아래 이벤트가 맡는다).
  useDayChange(() => applyMaterialize(recurrenceSeriesRef.current));

  // 앱을 열어둔 채 날짜가 바뀌었을 때에도 회차가 생기도록, 창이 다시 활성화되면 점검한다.
  useEffect(() => {
    function check() {
      if (document.visibilityState !== 'visible') return; // 탭이 숨겨질 때 오는 visibilitychange는 무시
      applyMaterialize(recurrenceSeriesRef.current);
    }
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [applyMaterialize]);

  function addRecurrenceSeries(input: {
    text: string;
    category: string;
    priority: Todo['priority'];
    frequency: RecurrenceFrequency;
    anchorDate: string;
    endDate?: string;
    kind?: TodoKind;
  }) {
    const text = input.text.trim();
    if (!text || !input.anchorDate) return;
    const series: RecurrenceSeries = {
      id: generateId(),
      text,
      category: input.category.trim() || '기본',
      priority: input.priority,
      frequency: input.frequency,
      anchorDate: input.anchorDate,
      endDate: input.endDate || undefined,
      kind: normalizeKind(input.kind),
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    applyMaterialize([...recurrenceSeries, series], true);
  }

  // 시리즈 규칙을 수정한다. 주기·기준일이 바뀌면 이후 회차 계산이 달라지도록 커서를 되감는다.
  // 이미 목록에 생성된 회차(Todo)는 건드리지 않는다.
  function updateRecurrenceSeries(
    id: string,
    updates: Partial<Pick<RecurrenceSeries, 'text' | 'category' | 'priority' | 'frequency' | 'anchorDate' | 'endDate' | 'kind'>>
  ) {
    setRecurrenceSeries(prev => prev.map(s => {
      if (s.id !== id) return s;
      const scheduleChanged =
        (updates.frequency !== undefined && updates.frequency !== s.frequency) ||
        (updates.anchorDate !== undefined && updates.anchorDate !== s.anchorDate);
      const next: RecurrenceSeries = {
        ...s,
        ...updates,
        endDate: 'endDate' in updates ? (updates.endDate || undefined) : s.endDate,
      };
      if (scheduleChanged) {
        // 오늘까지는 이미 채워진 것으로 보고, 앞으로의 회차만 새 규칙으로 생성한다.
        next.lastMaterializedDate = todayStr();
        next.status = 'active';
      }
      return next;
    }));
  }

  // 시리즈를 종료한다. 이후 회차 생성만 멈추고, 이미 만들어진 미완료 회차는 그대로 둔다.
  function endRecurrenceSeries(id: string) {
    setRecurrenceSeries(prev => prev.map(s =>
      s.id === id ? { ...s, status: 'ended' } : s
    ));
  }

  function resumeRecurrenceSeries(id: string) {
    setRecurrenceSeries(prev => prev.map(s =>
      s.id === id ? { ...s, status: 'active', lastMaterializedDate: todayStr() } : s
    ));
  }

  function exportRecurrenceSeries(): RecurrenceSeries[] { return recurrenceSeries; }

  function importRecurrenceSeries(valid: RecurrenceSeries[]): boolean {
    setRecurrenceSeries(valid);
    return true;
  }

  return {
    recurrenceSeries,
    setRecurrenceSeries,
    addRecurrenceSeries,
    updateRecurrenceSeries,
    endRecurrenceSeries,
    resumeRecurrenceSeries,
    exportRecurrenceSeries,
    importRecurrenceSeries,
  };
}
