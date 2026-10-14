import { spaceConfig } from '@/config/space'
import type { CameraRig } from '../camera/cameraRig'
import { createClickGuard, createDrag, createZoomIntent, type ControlOptions } from './drag'

const LINE_HEIGHT_PX = 16

/**
 * 마우스 조작: 끌어서 이동, 휠로 커서 지점 확대 · 축소.
 * 커서 위치에 따른 시차 · 근접 반응은 motion/pointer를 읽는 쪽(카메라 · 장면)이 맡는다.
 * 터치는 touchControls가 따로 처리한다.
 */
export function attachPointerControls(stage: HTMLElement, rig: CameraRig, options: ControlOptions): () => void {
  const drag = createDrag(rig)
  const guard = createClickGuard(stage)
  const intent = createZoomIntent(rig, options.onZoomSettled)
  let pressed: number | null = null

  const isMouse = (event: PointerEvent) => event.pointerType !== 'touch'

  const onDown = (event: PointerEvent) => {
    if (!isMouse(event) || event.button !== 0) return
    guard.disarm()
    pressed = event.pointerId
    drag.start({ x: event.clientX, y: event.clientY })
  }

  const onMove = (event: PointerEvent) => {
    if (event.pointerId !== pressed) return
    if (drag.move({ x: event.clientX, y: event.clientY }) && !stage.hasPointerCapture(event.pointerId)) {
      stage.setPointerCapture(event.pointerId)
      stage.dataset.dragging = 'true'
    }
  }

  const onUp = (event: PointerEvent) => {
    if (event.pointerId !== pressed) return
    pressed = null
    if (drag.end()) guard.arm()
    delete stage.dataset.dragging
  }

  const onWheel = (event: WheelEvent) => {
    event.preventDefault()
    const delta = event.deltaY * (event.deltaMode === WheelEvent.DOM_DELTA_LINE ? LINE_HEIGHT_PX : 1)
    rig.zoomAt({ x: event.clientX, y: event.clientY }, Math.exp(-delta * spaceConfig.interaction.wheelSensitivity))
    intent.schedule()
  }

  stage.addEventListener('pointerdown', onDown)
  stage.addEventListener('pointermove', onMove)
  stage.addEventListener('pointerup', onUp)
  stage.addEventListener('pointercancel', onUp)
  stage.addEventListener('wheel', onWheel, { passive: false })
  return () => {
    drag.cancel()
    guard.dispose()
    intent.dispose()
    stage.removeEventListener('pointerdown', onDown)
    stage.removeEventListener('pointermove', onMove)
    stage.removeEventListener('pointerup', onUp)
    stage.removeEventListener('pointercancel', onUp)
    stage.removeEventListener('wheel', onWheel)
  }
}
