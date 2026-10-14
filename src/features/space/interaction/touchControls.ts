import type { Point } from '@/types/ui'
import type { CameraRig } from '../camera/cameraRig'
import { spaceConfig } from '@/config/space'
import { createClickGuard, createDrag, createZoomIntent, isEmptySpace, type ControlOptions } from './drag'

const { doubleTapMs, doubleTapPx } = spaceConfig.interaction

/**
 * 터치 조작: 한 손가락으로 끌어 이동, 두 손가락으로 벌려 확대 · 축소(Pinch).
 * 누르기(Tap)는 각 요소의 click이 처리하므로 여기서는 끌기와 구분만 한다.
 * 빈 곳을 빠르게 두 번 탭하면 onDoubleTap을 부른다.
 */
export function attachTouchControls(stage: HTMLElement, rig: CameraRig, options: ControlOptions): () => void {
  const drag = createDrag(rig)
  const guard = createClickGuard(stage)
  const intent = createZoomIntent(rig, options.onZoomSettled)
  const touches = new Map<number, Point>()
  let pinchSpan = 0
  /** 직전에 빈 곳을 탭한 시각과 자리. 두 번 탭을 알아낸다 */
  let lastTap: { at: number; point: Point } | null = null
  let downOnEmpty = false

  const points = () => [...touches.values()]
  const span = () => {
    const [a, b] = points()
    return Math.hypot(a.x - b.x, a.y - b.y)
  }

  const onDown = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') return
    touches.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (touches.size === 1) {
      downOnEmpty = isEmptySpace(event.target)
      guard.disarm()
      drag.start(points()[0])
    } else if (touches.size === 2) {
      // 두 번째 손가락이 닿으면 끌기를 멈추고 Pinch로 넘어간다
      drag.cancel()
      rig.grab()
      rig.release(false)
      pinchSpan = span()
      guard.arm()
    }
  }

  const onMove = (event: PointerEvent) => {
    if (!touches.has(event.pointerId)) return
    touches.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (touches.size === 2 && pinchSpan > 0) {
      const next = span()
      rig.zoomBy(next / pinchSpan)
      pinchSpan = next
    } else if (touches.size === 1) {
      drag.move(points()[0])
    }
  }

  const onUp = (event: PointerEvent) => {
    if (!touches.delete(event.pointerId)) return
    if (pinchSpan > 0 && touches.size < 2) {
      pinchSpan = 0
      intent.schedule()
      // 남은 손가락으로 이어서 끌 수 있게 한다
      if (touches.size === 1) drag.start(points()[0])
      return
    }
    if (touches.size > 0) return
    if (drag.end()) {
      guard.arm()
      lastTap = null
      return
    }
    // 끌지 않고 뗐다: 빈 곳을 탭한 것. 바로 전 탭과 가깝고 빠르면 두 번 탭이다
    const point = { x: event.clientX, y: event.clientY }
    const now = performance.now()
    const isDouble =
      downOnEmpty &&
      lastTap !== null &&
      now - lastTap.at < doubleTapMs &&
      Math.hypot(point.x - lastTap.point.x, point.y - lastTap.point.y) < doubleTapPx
    if (isDouble) options.onDoubleTap()
    lastTap = downOnEmpty && !isDouble ? { at: now, point } : null
  }

  stage.addEventListener('pointerdown', onDown)
  stage.addEventListener('pointermove', onMove)
  stage.addEventListener('pointerup', onUp)
  stage.addEventListener('pointercancel', onUp)
  return () => {
    drag.cancel()
    guard.dispose()
    intent.dispose()
    stage.removeEventListener('pointerdown', onDown)
    stage.removeEventListener('pointermove', onMove)
    stage.removeEventListener('pointerup', onUp)
    stage.removeEventListener('pointercancel', onUp)
  }
}
