import { spaceConfig } from '@/config/space'
import { pointer } from '@/motion/pointer'
import { getMotion } from '@/motion/runtime'
import type { Point } from '@/types/ui'
import { clamp } from '@/utils/math'
import { cameraView, type Bounds, type CameraGoal } from './cameraView'

const config = spaceConfig.camera

export interface CameraLimits {
  zoomMin: number
  zoomMax: number
  bounds: Bounds
}

/**
 * 카메라 시스템. 조작(interaction)과 화면(scene)은 이 인터페이스만 알기 때문에
 * 움직임의 성격을 바꾸고 싶으면 이 구현만 교체하면 된다.
 */
export interface CameraRig {
  setViewport(width: number, height: number): void
  setLimits(limits: CameraLimits): void
  /** 연출 없이 바로 옮긴다 */
  jumpTo(goal: CameraGoal): void
  /** 목표 지점으로 가감속하며 이동한다 */
  flyTo(goal: CameraGoal, durationMs: number): void
  /** 사용자가 공간을 잡았다: 진행 중이던 이동과 관성을 멈춘다 */
  grab(): void
  /** 화면 px만큼 끌어 옮긴다. elapsedMs는 지난 입력으로부터의 시간(관성 계산용) */
  panBy(dx: number, dy: number, elapsedMs: number): void
  /** 놓았다. carry가 false면 관성 없이 멈춘다 */
  release(carry: boolean): void
  /** 화면의 한 점을 고정한 채 확대 · 축소한다 */
  zoomAt(screen: Point, factor: number): void
  /** 사용자가 맞춰 둔 배율(감쇠 전의 목표값) */
  goalZoom(): number
  update(dt: number, now: number): void
}

interface Tween {
  from: CameraGoal
  to: CameraGoal
  start: number
  duration: number
}

/** 프레임 길이에 상관없이 같은 빠르기로 목표에 다가가는 비율 */
function follow(dt: number, timeMs: number): number {
  return 1 - Math.exp(-dt / timeMs)
}

/**
 * 감쇠 카메라. 입력과 이동은 목표(goal)만 바꾸고, 화면의 카메라는 그 목표를
 * 약간의 지연을 두고 따라간다. 그래서 어떤 입력도 화면에 딱딱하게 꽂히지 않는다.
 */
export function createCameraRig(): CameraRig {
  const goal: CameraGoal = { x: 0, y: 0, z: 0, zoom: 1 }
  const velocity: Point = { x: 0, y: 0 }
  let limits: CameraLimits | null = null
  let tween: Tween | null = null
  let held = false

  const clampGoal = () => {
    if (!limits) return
    const pad = config.boundsPadding
    goal.zoom = clamp(goal.zoom, limits.zoomMin, limits.zoomMax)
    goal.x = clamp(goal.x, limits.bounds.minX - pad, limits.bounds.maxX + pad)
    goal.y = clamp(goal.y, limits.bounds.minY - pad, limits.bounds.maxY + pad)
  }

  return {
    setViewport(width, height) {
      cameraView.width = width
      cameraView.height = height
      cameraView.focal = config.focalRatio * ((width + height) / 2)
    },

    setLimits(next) {
      limits = next
    },

    jumpTo(target) {
      tween = null
      velocity.x = velocity.y = 0
      Object.assign(goal, target)
      Object.assign(cameraView, target)
    },

    flyTo(target, durationMs) {
      velocity.x = velocity.y = 0
      tween = { from: { ...goal }, to: { ...target }, start: performance.now(), duration: Math.max(durationMs, 1) }
    },

    grab() {
      tween = null
      held = true
      velocity.x = velocity.y = 0
    },

    panBy(dx, dy, elapsedMs) {
      const worldX = -dx / goal.zoom
      const worldY = -dy / goal.zoom
      goal.x += worldX
      goal.y += worldY
      clampGoal()
      const elapsed = Math.max(elapsedMs, 1)
      velocity.x = worldX / elapsed
      velocity.y = worldY / elapsed
    },

    release(carry) {
      held = false
      if (!carry) velocity.x = velocity.y = 0
    },

    zoomAt(screen, factor) {
      tween = null
      velocity.x = velocity.y = 0
      const offsetX = screen.x - cameraView.width / 2
      const offsetY = screen.y - cameraView.height / 2
      const before = goal.zoom
      goal.zoom = limits ? clamp(before * factor, limits.zoomMin, limits.zoomMax) : before * factor
      // 커서 아래의 지점이 그대로 커서 아래에 남도록 초점을 옮긴다
      goal.x += offsetX / before - offsetX / goal.zoom
      goal.y += offsetY / before - offsetY / goal.zoom
      clampGoal()
    },

    goalZoom: () => goal.zoom,

    update(dt, now) {
      if (tween) {
        const t = clamp((now - tween.start) / tween.duration, 0, 1)
        const eased = config.travelEase(t)
        const { from, to } = tween
        goal.zoom = from.zoom * (to.zoom / from.zoom) ** eased
        // 도착 지점이 화면 위에서 일정하게 중심으로 다가오도록 위치를 정한다
        const remaining = ((1 - eased) * from.zoom) / goal.zoom
        goal.x = to.x - (to.x - from.x) * remaining
        goal.y = to.y - (to.y - from.y) * remaining
        goal.z = to.z - (to.z - from.z) * (1 - eased)
        if (t >= 1) tween = null
      } else if (!held && Math.hypot(velocity.x, velocity.y) * goal.zoom > config.minInertia) {
        goal.x += velocity.x * dt
        goal.y += velocity.y * dt
        const friction = config.inertiaFriction ** (dt / 16)
        velocity.x *= friction
        velocity.y *= friction
        clampGoal()
      }

      // 화면의 카메라는 목표를 약간 늦게 따라간다
      const k = follow(dt, config.followMs)
      cameraView.x += (goal.x - cameraView.x) * k
      cameraView.y += (goal.y - cameraView.y) * k
      cameraView.z += (goal.z - cameraView.z) * k
      cameraView.zoom *= (goal.zoom / cameraView.zoom) ** k

      // 마우스 시차 + 아주 느린 표류: 카메라가 옆으로 밀리면 가까운 것이 더 크게 움직인다
      const { parallax, background } = getMotion()
      const drift = config.idleDriftPx * background
      const shiftX =
        (pointer.active ? pointer.nx * config.parallaxShiftPx * parallax : 0) +
        Math.sin(now * config.idleDriftSpeed) * drift
      const shiftY =
        (pointer.active ? pointer.ny * config.parallaxShiftPx * parallax : 0) +
        Math.cos(now * config.idleDriftSpeed * 0.77) * drift
      const p = follow(dt, config.parallaxFollowMs)
      cameraView.offsetX += (shiftX / cameraView.zoom - cameraView.offsetX) * p
      cameraView.offsetY += (shiftY / cameraView.zoom - cameraView.offsetY) * p
    },
  }
}
