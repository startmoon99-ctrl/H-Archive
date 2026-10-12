import { useSyncExternalStore } from 'react'
import { layoutForWidth, type LayoutId } from '@/config/layout'
import { readUiScale } from '@/styles/injectTokens'

export interface Viewport {
  width: number
  height: number
  layout: LayoutId
  /**
   * Hover가 없거나 화면이 좁다. true면 모바일 UX(하단 Dock · 프로젝트 Rail · 항상 보이는 라벨)를 쓴다.
   * 구조 자체가 달라지는 분기는 이 값으로, 치수만 달라지는 분기는 CSS의 :root[data-layout]으로 한다.
   */
  touchUi: boolean
  /**
   * 화면 배율(1 = 기준). QHD · 4K처럼 넓은 화면에서 커진다.
   * px로 계산하는 값(행성 크기, 고정 UI 높이, 별의 크기)에 곱해 CSS의 rem과 맞춘다.
   */
  scale: number
}

const hoverQuery = window.matchMedia('(hover: hover) and (pointer: fine)')

function read(): Viewport {
  const layout = layoutForWidth(window.innerWidth)
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    layout,
    touchUi: layout === 'mobile' || !hoverQuery.matches,
    scale: readUiScale(),
  }
}

let current = read()
const listeners = new Set<() => void>()
let scheduled = 0

function publish(): void {
  const root = document.documentElement
  root.dataset.layout = current.layout
  root.dataset.ui = current.touchUi ? 'touch' : 'pointer'
}

function update(): void {
  scheduled = 0
  current = read()
  publish()
  for (const listener of listeners) listener()
}

function schedule(): void {
  if (scheduled === 0) scheduled = requestAnimationFrame(update)
}

window.addEventListener('resize', schedule)
hoverQuery.addEventListener('change', schedule)
publish()

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useViewport(): Viewport {
  return useSyncExternalStore(subscribe, () => current)
}
