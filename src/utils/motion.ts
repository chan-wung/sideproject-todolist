// 시스템의 '동작 줄이기' 설정이 켜져 있는지
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

// 스크롤 이동 방식: 동작 줄이기가 켜져 있으면 부드럽게 움직이지 않고 바로 이동한다.
// (JS에서 behavior를 직접 주면 CSS의 scroll-behavior 설정이 무시되므로 여기서 같이 따른다)
export function smoothScrollBehavior(): ScrollBehavior {
  return prefersReducedMotion() ? 'auto' : 'smooth';
}
