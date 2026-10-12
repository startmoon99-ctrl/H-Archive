/**
 * 앱 전체가 함께 쓰는 하나의 rAF 루프.
 * 구독자가 없거나 탭이 가려지면 멈춘다. 카메라 · 배경 · 커서 빛이 각자 루프를 돌리지 않게 한다.
 */
type TickFn = (dt: number, now: number) => void

const MAX_FRAME_MS = 64
const subscribers = new Set<TickFn>()
let frame = 0
let last = 0

function loop(now: number): void {
  const dt = Math.min(now - last, MAX_FRAME_MS)
  last = now
  for (const fn of subscribers) fn(dt, now)
  frame = subscribers.size > 0 ? requestAnimationFrame(loop) : 0
}

function start(): void {
  if (frame !== 0 || subscribers.size === 0 || document.hidden) return
  last = performance.now()
  frame = requestAnimationFrame(loop)
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    cancelAnimationFrame(frame)
    frame = 0
  } else {
    start()
  }
})

export function onTick(fn: TickFn): () => void {
  subscribers.add(fn)
  start()
  return () => {
    subscribers.delete(fn)
  }
}
