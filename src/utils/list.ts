// list[from]을 빼서 to 위치(이동 전 배열 기준 index)에 끼운 새 배열을 반환한다.
// 범위를 벗어났거나 같은 위치면 원본 배열을 그대로 돌려준다.
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) return list;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
