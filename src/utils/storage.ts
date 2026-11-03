// localStorage에 JSON으로 저장한다. 용량 초과·사생활 보호 모드 등으로 실패해도 앱은 계속 동작한다.
export function writeStorage(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn('localStorage write failed:', e);
  }
}
