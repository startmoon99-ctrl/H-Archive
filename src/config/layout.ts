/** 화면 폭 기준. CSS는 media query 대신 <html data-layout> 선택자로 분기한다. */
export const BREAKPOINTS = {
  mobile: 720,
  tablet: 1080,
} as const

export type LayoutId = 'mobile' | 'tablet' | 'desktop'

export function layoutForWidth(width: number): LayoutId {
  if (width < BREAKPOINTS.mobile) return 'mobile'
  if (width < BREAKPOINTS.tablet) return 'tablet'
  return 'desktop'
}

/**
 * 화면 위에 고정되는 UI의 크기(px). 공간 카메라가 가려지지 않는 영역을 계산할 때도 쓰므로
 * CSS에 다시 적지 않고 injectTokens가 --hud-height 등으로 주입한다.
 */
export const CHROME = {
  hudHeight: 64,
  dockHeight: 64,
  railHeight: 152,
} as const
