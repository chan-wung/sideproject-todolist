// ── 저장 상태 (저장에 실패한 키, 보관된 손상 원문) ───────────────────────
// 화면이 구독해 "저장하지 못함"·"읽을 수 없는 데이터" 안내를 보여 줄 수 있게 한다.
export const CORRUPT_BACKUP_PREFIX = 'todolist-corrupt:';

export interface StorageStatus {
  failedKeys: string[]; // 마지막 저장이 실패한 키
  corruptKeys: string[]; // 읽을 수 없어 보관된 원문의 원래 키
  staleKeys: string[]; // 이 탭이 읽은 뒤 다른 탭(창)이 바꾼 키 — 덮어쓰지 않도록 저장을 멈춰 둔 상태
}

const unsaved = new Map<string, unknown>(); // 실패한 키 → 저장하지 못한 최신 값 (재시도용)

// ── 여러 탭/창 충돌 감지 ────────────────────────────────────────────
// 같은 주소의 탭이 둘 이상이면 각자 메모리의 전체 배열을 저장하므로, 오래된 쪽이 저장하면 다른 탭의 변경을 지운다.
// 이 탭이 마지막으로 읽거나 쓴 원문(known)과 지금 저장소의 원문이 다르면 다른 탭이 바꾼 것이다.
// 그 키는 사용자가 고를 때까지 저장을 멈추고(blocked에 최신 값 보관), 화면의 내용은 그대로 둔다.
const known = new Map<string, string | null>();
const stale = new Set<string>();
const blocked = new Map<string, unknown>();
const listeners = new Set<() => void>();
let snapshot: StorageStatus | null = null;

function scanCorruptKeys(): string[] {
  const keys: string[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(CORRUPT_BACKUP_PREFIX)) keys.push(k.slice(CORRUPT_BACKUP_PREFIX.length));
    }
  } catch {
    // 저장소를 읽을 수 없으면 보관본도 없는 것으로 본다
  }
  return keys.sort();
}

function changed() {
  snapshot = null;
  // 렌더 도중에 호출될 수 있어(읽기 단계에서 보관) 구독자 알림은 렌더가 끝난 뒤로 미룬다
  queueMicrotask(() => listeners.forEach(l => l()));
}

export function subscribeStorageStatus(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function getStorageStatus(): StorageStatus {
  snapshot ??= { failedKeys: [...unsaved.keys()].sort(), corruptKeys: scanCorruptKeys(), staleKeys: [...stale].sort() };
  return snapshot;
}

function currentRaw(key: string): string | null | undefined {
  try { return localStorage.getItem(key); } catch { return undefined; } // undefined: 읽을 수 없음
}

// 이 탭이 알고 있는 원문과 저장소의 원문이 다르면(저장소가 비어 있는 경우는 잃을 게 없으니 제외) 다른 탭이 바꾼 것이다.
function isChangedElsewhere(key: string): boolean {
  if (!known.has(key)) return false;
  const now = currentRaw(key);
  return now !== undefined && now !== null && now !== known.get(key);
}

// 다른 탭에서 온 storage 이벤트: 저장을 시도하기 전에도 바뀐 것을 알린다.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', e => {
    if (e.storageArea && e.storageArea !== window.localStorage) return;
    const keys = e.key === null ? [...known.keys()] : known.has(e.key) ? [e.key] : [];
    let any = false;
    for (const key of keys) {
      if (stale.has(key) || (e.newValue ?? null) === known.get(key)) continue;
      stale.add(key);
      any = true;
    }
    if (any) changed();
  });
}

// 이 탭의 내용으로 계속한다: 지금 저장소의 값을 기준으로 삼고, 멈춰 둔 최신 값을 저장한다 (다른 탭의 변경을 덮어쓴다).
export function keepThisTabData() {
  for (const key of stale) {
    const now = currentRaw(key);
    if (now !== undefined) known.set(key, now);
  }
  stale.clear();
  for (const [key, value] of [...blocked]) {
    blocked.delete(key);
    writeStorage(key, value);
  }
  changed();
}

// 테스트용: 추적 중인 상태를 모두 비운다
export function resetStorageTracking() {
  known.clear();
  stale.clear();
  blocked.clear();
  unsaved.clear();
  changed();
}

// localStorage에 JSON으로 저장한다. 용량 초과·사생활 보호 모드 등으로 실패해도 앱은 계속 동작한다.
// 저장에 성공했는지 돌려준다. 실패한 키와 값은 기억해 두었다가 retryFailedWrites로 다시 시도한다.
export function writeStorage(key: string, value: unknown): boolean {
  try {
    const serialized = JSON.stringify(value);
    if (isChangedElsewhere(key)) {
      // 다른 탭이 먼저 바꿨다: 덮어쓰지 않고 최신 값만 보관해 둔다
      const isNew = !stale.has(key);
      stale.add(key);
      blocked.set(key, value);
      if (isNew) changed();
      return false;
    }
    localStorage.setItem(key, serialized);
    known.set(key, serialized);
    blocked.delete(key);
    if (unsaved.delete(key)) changed();
    return true;
  } catch (e) {
    console.warn('localStorage write failed:', e);
    const isNew = !unsaved.has(key);
    unsaved.set(key, value);
    if (isNew) changed(); // 같은 키가 계속 실패하는 동안(타이핑마다)은 다시 알리지 않는다
    return false;
  }
}

// 저장하지 못한 값을 다시 저장해 본다. 아직 실패하는 키 목록을 돌려준다.
export function retryFailedWrites(): string[] {
  for (const [key, value] of [...unsaved]) writeStorage(key, value);
  return [...unsaved.keys()];
}

// 보관된 손상 원문 전체: { 원래 키: 원문 }
export function readCorruptBackups(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of getStorageStatus().corruptKeys) {
    try {
      const raw = localStorage.getItem(CORRUPT_BACKUP_PREFIX + key);
      if (raw !== null) out[key] = raw;
    } catch {
      // 읽지 못하면 건너뛴다
    }
  }
  return out;
}

// 보관된 손상 원문을 모두 지운다 (사용자가 내려받았거나 필요 없다고 확인한 뒤에만 호출).
export function discardCorruptBackups() {
  for (const key of scanCorruptKeys()) {
    try { localStorage.removeItem(CORRUPT_BACKUP_PREFIX + key); } catch { /* 지우지 못해도 앱은 계속 동작 */ }
  }
  changed();
}

// 읽을 수 없는(깨졌거나 검증에 실패한) 원문은 기본값으로 덮어쓰이기 전에 따로 한 번 보관한다.
// 이미 보관본이 있으면 처음 것을 지키고 덮어쓰지 않는다. 원문은 로그에 남기지 않는다.
export function stashCorrupt(key: string, raw: string) {
  try {
    const stashKey = CORRUPT_BACKUP_PREFIX + key;
    if (localStorage.getItem(stashKey) === null) {
      localStorage.setItem(stashKey, raw);
      changed();
    }
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
    known.set(key, raw); // 이 탭이 읽은 시점의 원문 (다른 탭 변경 감지의 기준)
    if (!raw) return fallback;
    const parsed = parse(JSON.parse(raw));
    if (parsed !== null) return parsed;
  } catch {
    // 아래에서 원문을 보관하고 fallback을 돌려준다
  }
  if (raw) stashCorrupt(key, raw);
  return fallback;
}
