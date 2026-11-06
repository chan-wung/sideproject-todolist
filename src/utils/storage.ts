// localStorage에 JSON으로 저장한다. 용량 초과·사생활 보호 모드 등으로 실패해도 앱은 계속 동작한다.
// 저장에 성공했는지 돌려준다 (실패 안내를 보여 줄 때 쓴다).
export function writeStorage(key: string, value: unknown): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (e) {
    console.warn('localStorage write failed:', e);
    return false;
  }
}

// 읽을 수 없는(깨졌거나 검증에 실패한) 원문은 기본값으로 덮어쓰이기 전에 따로 한 번 보관한다.
// 이미 보관본이 있으면 처음 것을 지키고 덮어쓰지 않는다. 원문은 로그에 남기지 않는다.
export const CORRUPT_BACKUP_PREFIX = 'todolist-corrupt:';

export function stashCorrupt(key: string, raw: string) {
  try {
    const stashKey = CORRUPT_BACKUP_PREFIX + key;
    if (localStorage.getItem(stashKey) === null) localStorage.setItem(stashKey, raw);
  } catch {
    // 보관도 못 하면(용량 초과 등) 어쩔 수 없다. 앱 동작은 막지 않는다.
  }
}

// writeStorage와 짝. 저장된 JSON을 parse(검증 함수)에 통과시켜 읽는다.
// 값이 없으면 fallback. 깨졌거나 검증에 실패(null)해도 fallback을 돌려주되 원문은 보관해 둔다.
export function readStorage<T>(key: string, parse: (raw: unknown) => T | null, fallback: T): T {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = parse(JSON.parse(raw));
    if (parsed !== null) return parsed;
  } catch {
    // 아래에서 원문을 보관하고 fallback을 돌려준다
  }
  if (raw) stashCorrupt(key, raw);
  return fallback;
}
