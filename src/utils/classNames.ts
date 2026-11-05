// 조건부 클래스 이름을 공백으로 이어 붙인다. 거짓 값('' · false · null · undefined)은 건너뛴다.
export function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}
