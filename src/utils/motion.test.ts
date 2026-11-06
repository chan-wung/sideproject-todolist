import { describe, it, expect, afterEach, vi } from 'vitest';
import { prefersReducedMotion, smoothScrollBehavior } from './motion';

function mockMatchMedia(matches: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: matches && query.includes('reduce'), media: query }));
}

describe('동작 줄이기', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('설정이 켜져 있으면 스크롤을 바로 이동한다', () => {
    mockMatchMedia(true);
    expect(prefersReducedMotion()).toBe(true);
    expect(smoothScrollBehavior()).toBe('auto');
  });

  it('설정이 꺼져 있으면 부드럽게 이동한다', () => {
    mockMatchMedia(false);
    expect(smoothScrollBehavior()).toBe('smooth');
  });
});
