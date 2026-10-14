import { spaceConfig } from '@/config/space'
import type { Point } from '@/types/ui'
import type { CameraRig } from '../camera/cameraRig'

const config = spaceConfig.interaction

/**
 * 한 번의 끌기. 조금이라도 움직여야 끌기로 보고(그 전에는 누르기), 놓을 때의 속도를 관성으로 넘긴다.
 * 마우스와 터치 조작이 함께 쓴다.
 */
export function createDrag(rig: CameraRig) {
  let last: Point | null = null
  let travelled = 0
  let lastMoveAt = 0
  let dragging = false

  return {
    start(point: Point) {
      last = point
      travelled = 0
      dragging = false
    },

    /** 끌기가 시작됐으면 true */
    move(point: Point): boolean {
      if (!last) return false
      const dx = point.x - last.x
      const dy = point.y - last.y
      last = point
      travelled += Math.hypot(dx, dy)
      if (!dragging) {
        if (travelled <= config.dragThresholdPx) return false
        dragging = true
        rig.grab()
        lastMoveAt = performance.now()
        return true
      }
      const now = performance.now()
      // 끌기는 공간의 중심(카메라의 초점)을 축으로 한 공전이다. 평행 이동(rig.panBy)은 남겨 두었다
      rig.orbitBy(dx, dy, now - lastMoveAt)
      lastMoveAt = now
      return true
    },

    /** 끌기였다면 true(뒤따르는 click을 무시해야 한다) */
    end(): boolean {
      const wasDragging = dragging
      if (dragging) rig.release(performance.now() - lastMoveAt <= config.staleVelocityMs)
      last = null
      dragging = false
      return wasDragging
    },

    cancel() {
      if (dragging) rig.release(false)
      last = null
      dragging = false
    },
  }
}

/** 끌거나 확대한 직후의 click이 선택으로 이어지지 않게 막는다 */
export function createClickGuard(stage: HTMLElement) {
  let suppress = false
  const onClick = (event: MouseEvent) => {
    if (!suppress) return
    suppress = false
    event.stopPropagation()
    event.preventDefault()
  }
  stage.addEventListener('click', onClick, true)
  return {
    arm() {
      suppress = true
    },
    disarm() {
      suppress = false
    },
    dispose() {
      stage.removeEventListener('click', onClick, true)
    },
  }
}

/** 확대 · 축소가 멈춘 뒤 한 번만 알린다(성단 진입 · 이탈 판단용) */
export function createZoomIntent(rig: CameraRig, onSettled: (zoom: number) => void) {
  let timer = 0
  return {
    schedule() {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => onSettled(rig.goalZoom()), config.zoomIntentDelayMs)
    },
    dispose() {
      window.clearTimeout(timer)
    },
  }
}

export interface ControlOptions {
  onZoomSettled: (zoom: number) => void
  /** 빈 곳을 두 번 눌렀다(더블클릭 · 두 번 탭) */
  onDoubleTap: () => void
}

/** 누르면 저마다 할 일이 있는 요소. 이 위를 두 번 눌러도 카메라를 되돌리지 않는다 */
const INTERACTIVE = 'button, a, input, textarea, select, [role="button"]'

/** 빈 곳(공간 자체)을 눌렀는가 */
export function isEmptySpace(target: EventTarget | null): boolean {
  return !(target instanceof Element && target.closest(INTERACTIVE))
}
