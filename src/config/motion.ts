/**
 * 애니메이션 값의 단일 출처.
 * styles/injectTokens.ts 가 --motion-* / --ease-* CSS 변수로 주입하므로 CSS와 JS가 같은 값을 쓴다.
 */
export const MOTION = {
  duration: {
    fast: 120,
    base: 200,
    slow: 300,
  },
  easing: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    exit: 'cubic-bezier(0.4, 0, 1, 1)',
  },
} as const;
