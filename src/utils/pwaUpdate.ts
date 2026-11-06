// 서비스 워커가 새 버전을 받아 두었을 때의 상태. main.tsx가 알려 주고 UpdateNotice가 보여 준다.
// 새 버전을 곧바로 적용하면 화면이 다시 불러와져 아직 등록하지 않은 입력이 사라지므로, 적용은 사용자가 고른다.
let ready = false;
let apply: (() => void) | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(l => l());
}

export function markUpdateReady(applyUpdate: () => void) {
  apply = applyUpdate;
  ready = true;
  notify();
}

export function dismissUpdate() {
  ready = false;
  notify();
}

// 새 버전을 적용한다 (서비스 워커를 교체하고 화면을 다시 불러온다)
export function applyUpdate() {
  apply?.();
}

export function subscribeUpdate(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function isUpdateReady() {
  return ready;
}
