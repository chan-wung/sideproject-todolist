// 글이 max자보다 길면 앞 max자만 남기고 '…'을 붙인다 (확인 문구 등에서 제목을 줄여 보일 때).
export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}
