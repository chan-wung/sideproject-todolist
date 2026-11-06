import { useEffect, useState } from 'react';
import { usePersistentState } from './usePersistentState';
import { readStorage, writeStorage } from '../utils/storage';
import { generateId } from '../utils/id';
import { validateMemos } from '../utils/memoData';
import type { Memo } from '../types/memo';


import { MEMOS_KEY } from '../constants/storageKeys';
const LEGACY_CONTENT_KEY = 'todolist-memo-content'; // 메모가 하나뿐이던 옛 버전의 저장 키

// 새 형식의 메모 목록이 아직 한 번도 저장되지 않았을 때만(키가 없을 때), 옛 단일 메모를 '기본 메모'로 옮긴다.
// 사용자가 메모를 비워 `[]`가 저장된 뒤에는 옛 내용을 다시 읽지 않는다.
function readInitialMemos(): { memos: Memo[]; migratedLegacy: boolean } {
  let hasNewKey = true;
  try { hasNewKey = localStorage.getItem(MEMOS_KEY) !== null; } catch { /* 읽을 수 없으면 이행하지 않는다 */ }
  if (hasNewKey) return { memos: readStorage(MEMOS_KEY, validateMemos, []), migratedLegacy: false };
  const content = readStorage<string | null>(LEGACY_CONTENT_KEY, raw => (typeof raw === 'string' ? raw : null), null);
  if (!content) return { memos: [], migratedLegacy: false };
  return { memos: [{ id: generateId(), title: '기본 메모', content }], migratedLegacy: true };
}

function removeLegacyContent() {
  try { localStorage.removeItem(LEGACY_CONTENT_KEY); } catch { /* 지우지 못해도 이행 표시(새 키)가 있어 다시 읽지 않는다 */ }
}

export function useMemos() {
  const [initial] = useState(readInitialMemos); // 처음 한 번만 계산한다
  const [memos, setMemos] = usePersistentState<Memo[]>(MEMOS_KEY, initial.memos, validateMemos);
  const [activeId, setActiveId] = usePersistentState<string | null>('todolist-active-memo', null);

  // 옛 메모를 옮겼다면 새 형식 저장에 성공한 뒤에만 옛 키를 지운다 (실패하면 다음 실행에 다시 시도).
  useEffect(() => {
    if (initial.migratedLegacy && writeStorage(MEMOS_KEY, memos)) removeLegacyContent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 고른 메모가 없거나 사라졌으면 첫 메모를 고른다 (메모장 화면을 열지 않아도 항상 맞게 유지).
  useEffect(() => {
    if (memos.length > 0 && !memos.some(m => m.id === activeId)) setActiveId(memos[0].id);
  }, [memos, activeId, setActiveId]);

  function resetMemos() {
    removeLegacyContent();
    setMemos([]);
    setActiveId(null);
  }

  function replaceMemos(incoming: Memo[]) {
    removeLegacyContent();
    setMemos(incoming);
    return true;
  }

  return { memos, setMemos, activeId, setActiveId, resetMemos, replaceMemos };
}
