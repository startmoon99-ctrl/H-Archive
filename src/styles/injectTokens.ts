import { CHROME } from '@/config/layout'

const ROOT_FONT_PX = 16

/** JS 계산과 CSS가 함께 쓰는 고정 UI 크기를 CSS 변수로 내보낸다. 화면 배율을 따르도록 rem으로 쓴다. */
export function injectTokens(): void {
  const style = document.documentElement.style
  style.setProperty('--hud-height', `${CHROME.hudHeight / ROOT_FONT_PX}rem`)
  style.setProperty('--dock-height', `${CHROME.dockHeight / ROOT_FONT_PX}rem`)
  style.setProperty('--rail-height', `${CHROME.railHeight / ROOT_FONT_PX}rem`)
}

/** 지금의 화면 배율(1 = 기준 크기). root 글자 크기에서 읽는다. */
export function readUiScale(): number {
  return parseFloat(getComputedStyle(document.documentElement).fontSize) / ROOT_FONT_PX || 1
}
