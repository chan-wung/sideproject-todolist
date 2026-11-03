import { useState } from 'react';

// 할 일 다중 선택 모드 상태. 모드를 켜고 끌 때는 선택이 항상 초기화된다.
export function useSelection() {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggleMode() {
    setSelectionMode(prev => !prev);
    setSelectedIds(new Set());
  }

  function toggle(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll(ids: string[]) {
    setSelectedIds(new Set(ids));
  }

  function clear() {
    setSelectedIds(new Set());
  }

  return { selectionMode, selectedIds, toggleMode, toggle, selectAll, clear };
}
