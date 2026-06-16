import { usePersistentState } from './usePersistentState';

export interface Memo {
  id: string;
  title: string;
  content: string;
  pinned?: boolean;
}

export function useMemos() {
  const [memos, setMemos] = usePersistentState<Memo[]>('todolist-memos-array', []);
  const [activeId, setActiveId] = usePersistentState<string | null>('todolist-active-memo', null);

  function resetMemos() {
    setMemos([]);
    setActiveId(null);
  }

  function replaceMemos(incoming: unknown): boolean {
    if (!Array.isArray(incoming)) return false;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ok = incoming.every((o: any) => o && typeof o.id === 'string' && typeof o.title === 'string' && typeof o.content === 'string');
    if (!ok) return false;
    setMemos(incoming as Memo[]);
    return true;
  }

  return { memos, setMemos, activeId, setActiveId, resetMemos, replaceMemos };
}
