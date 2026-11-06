// 한글 같은 IME로 글자를 조합하는 중인지. 조합 중 누른 Enter는 글자를 확정하는 키라서 등록·저장으로 쓰면 안 된다.
// isComposing이 없는 브라우저(일부 구형 웹뷰)는 조합 중 keyCode를 229로 보내는 점을 함께 본다.
export function isImeComposing(e: { nativeEvent: { isComposing?: boolean }; keyCode?: number }): boolean {
  return e.nativeEvent.isComposing === true || e.keyCode === 229;
}
