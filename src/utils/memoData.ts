import type { Memo } from '../types/memo';

// 메모 목록의 저장 데이터 검증. localStorage에서 읽을 때와 백업 파일을 가져올 때 같이 쓴다.
export function validateMemos(incoming: unknown): Memo[] | null {
  if (!Array.isArray(incoming)) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ok = incoming.every((o: any) => o && typeof o.id === 'string' && typeof o.title === 'string' && typeof o.content === 'string');
  if (!ok) return null;
  return incoming as Memo[];
}
