import type { Point } from '@/types/ui'
import type { CameraRig } from '../camera/cameraRig'
import { createClickGuard, createDrag, createZoomIntent, type ControlOptions } from './drag'

/**
 * 터치 조작: 한 손가락으로 끌어 이동, 두 손가락으로 벌려 확대 · 축소(Pinch).
 * 누르기(Tap)는 각 요소의 click이 처리하므로 여기서는 끌기와 구분만 한다.
 */
export function attachTouchControls(stage: HTMLElement, rig: CameraRig, options: ControlOptions): () => void {
  const drag = createDrag(rig)
  const guard = createClickGuard(stage)
  const intent = createZoomIntent(rig, options.onZoomSettled)
  const touches = new Map<number, Point>()
  let pinchSpan = 0

  const points = () => [...touches.values()]
  const span = () => {
    const [a, b] = points()
    return Math.hypot(a.x - b.x, a.y - b.y)
  }
  const middle = (): Point => {
    const [a, b] = points()
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  }

  const onDown = (event: PointerEvent) => {
    if (event.pointerType !== 'touch') return
    touches.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (touches.size === 1) {
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
      rig.zoomAt(middle(), next / pinchSpan)
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
    if (touches.size === 0 && drag.end()) guard.arm()
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
