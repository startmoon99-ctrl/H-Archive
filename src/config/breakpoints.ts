/**
 * Breakpoint의 단일 출처.
 * CSS는 media query 대신 <html data-layout="…"> 속성을 기준으로 분기한다 (hooks/useLayout.ts).
 */
export const BREAKPOINTS = {
  tablet: 768,
  desktop: 1180,
} as const;

export type Layout = 'mobile' | 'tablet' | 'desktop';

export const resolveLayout = (width: number): Layout => {
  if (width >= BREAKPOINTS.desktop) return 'desktop';
  if (width >= BREAKPOINTS.tablet) return 'tablet';
  return 'mobile';
};
