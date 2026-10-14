import { spaceConfig } from '@/config/space'
import type { CameraRig } from '../camera/cameraRig'
import { createClickGuard, createDrag, createZoomIntent, isEmptySpace, type ControlOptions } from './drag'

const LINE_HEIGHT_PX = 16

/**
 * 마우스 조작: 끌어서 돌기, 휠로 확대 · 축소, 빈 곳 더블클릭(onDoubleTap).
 * 커서 위치에 따른 시차 · 근접 반응은 motion/pointer를 읽는 쪽(카메라 · 장면)이 맡는다.
 * 터치는 touchControls가 따로 처리한다.
 */
export function attachPointerControls(stage: HTMLElement, rig: CameraRig, options: ControlOptions): () => void {
  const drag = createDrag(rig)
  const guard = createClickGuard(stage)
  const intent = createZoomIntent(rig, options.onZoomSettled)
  let pressed: number | null = null
  /** 터치의 두 번 탭은 touchControls가 받으므로, 터치가 만든 dblclick은 무시한다 */
  let lastPointerType = ''

  const isMouse = (event: PointerEvent) => event.pointerType !== 'touch'

  const onDown = (event: PointerEvent) => {
    lastPointerType = event.pointerType
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
    rig.zoomBy(Math.exp(-delta * spaceConfig.interaction.wheelSensitivity))
    intent.schedule()
  }

  const onDoubleClick = (event: MouseEvent) => {
    if (lastPointerType === 'touch' || !isEmptySpace(event.target)) return
    options.onDoubleTap()
  }

  stage.addEventListener('pointerdown', onDown)
  stage.addEventListener('dblclick', onDoubleClick)
  stage.addEventListener('pointermove', onMove)
  stage.addEventListener('pointerup', onUp)
  stage.addEventListener('pointercancel', onUp)
  stage.addEventListener('wheel', onWheel, { passive: false })
  return () => {
    drag.cancel()
    guard.dispose()
    intent.dispose()
    stage.removeEventListener('pointerdown', onDown)
    stage.removeEventListener('dblclick', onDoubleClick)
    stage.removeEventListener('pointermove', onMove)
    stage.removeEventListener('pointerup', onUp)
    stage.removeEventListener('pointercancel', onUp)
    stage.removeEventListener('wheel', onWheel)
  }
}
