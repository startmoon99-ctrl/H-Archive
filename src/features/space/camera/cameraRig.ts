import { spaceConfig } from '@/config/space'
import { pointer } from '@/motion/pointer'
import { getMotion } from '@/motion/runtime'
import { clamp, degToRad } from '@/utils/math'
import { cameraView, orient, type Bounds, type CameraGoal } from './cameraView'

const config = spaceConfig.camera
const idleConfig = config.idleOrbit
const { orbitDegPerPx, orbitPitchLimitDeg } = spaceConfig.interaction
const PITCH_LIMIT = degToRad(orbitPitchLimitDeg)
const TAU = Math.PI * 2
/** 새 방향을 고를 때 지금 방향과 충분히 다른 것을 찾아보는 횟수 */
const TURN_TRIES = 8

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
  /**
   * 목표 지점으로 가감속하며 이동한다. ease를 주지 않으면 config의 travelEase를 쓴다.
   * goal에 yaw · pitch가 있으면 그 방향으로 함께 돌아가고(가까운 쪽으로), 없으면 지금 방향을 유지한다.
   */
  flyTo(goal: CameraGoal, durationMs: number, ease?: (t: number) => number): void
  /** 지금 향하고 있는 목표(이동 중이면 그 도착점, 방향 포함). 나중에 그 자리로 되돌아올 때 쓴다 */
  current(): Required<CameraGoal>
  /** 사용자가 공간을 잡았다: 진행 중이던 이동과 관성을 멈춘다 */
  grab(): void
  /** 초점을 중심으로 돈다(화면 px만큼 끈 양). elapsedMs는 지난 입력으로부터의 시간(관성 계산용) */
  orbitBy(dx: number, dy: number, elapsedMs: number): void
  /** 화면 px만큼 끌어 옮긴다(지금 방향 기준). elapsedMs는 지난 입력으로부터의 시간(관성 계산용) */
  panBy(dx: number, dy: number, elapsedMs: number): void
  /** 놓았다. carry가 false면 관성 없이 멈춘다 */
  release(carry: boolean): void
  /**
   * 확대 · 축소만 한다: 지금 바라보는 중심과 방향은 그대로 두고 그 중심을 향해 다가가거나 물러난다.
   * (커서 쪽으로 중심을 옮기지 않으므로 확대 · 축소를 오가도 구도의 중심이 틀어지지 않는다)
   */
  zoomBy(factor: number): void
  /** 사용자가 맞춰 둔 배율(감쇠 전의 목표값) */
  goalZoom(): number
  /**
   * 가만히 있을 때의 공전을 허락한다(전체 보기 · 인트로 뒤 · 성단 위치 조절이 아닐 때).
   * 허락돼 있어도 입력이 끊긴 지 config.idleOrbit.delayMs가 지나야 시작한다
   */
  setIdleOrbit(allowed: boolean): void
  update(dt: number, now: number): void
}

interface Tween {
  from: Required<CameraGoal>
  to: Required<CameraGoal>
  start: number
  duration: number
  ease: (t: number) => number
}

/** 프레임 길이에 상관없이 같은 빠르기로 목표에 다가가는 비율 */
function follow(dt: number, timeMs: number): number {
  return 1 - Math.exp(-dt / timeMs)
}

/** -π ~ π로 접는다(가까운 쪽으로 돌기 위해) */
function wrapAngle(angle: number): number {
  return angle - TAU * Math.round(angle / TAU)
}

/**
 * 감쇠 카메라. 입력과 이동은 목표(goal)만 바꾸고, 화면의 카메라는 그 목표를
 * 약간의 지연을 두고 따라간다. 그래서 어떤 입력도 화면에 딱딱하게 꽂히지 않는다.
 * 끌기는 초점(공전의 중심)을 축으로 카메라가 실제로 도는 Orbit이고, 초점까지의 거리는 그대로다.
 */
export function createCameraRig(): CameraRig {
  const goal: Required<CameraGoal> = { x: 0, y: 0, z: 0, zoom: 1, yaw: 0, pitch: 0 }
  /** 끌기를 놓은 뒤 이어지는 이동(world/ms)과 회전(rad/ms) */
  const velocity = { x: 0, y: 0, z: 0, yaw: 0, pitch: 0 }
  let limits: CameraLimits | null = null
  let tween: Tween | null = null
  let held = false

  /**
   * 가만히 있을 때의 공전. 각도는 시작한 자리(anchor)를 중심으로 한 타원 안에서 떠돈다.
   * heading은 그 타원을 원으로 편 공간에서의 진행 방향(라디안)이고, 정해 둔 목표(target) 쪽으로 천천히 돌아선다.
   */
  const idle = {
    allowed: false,
    /** 마지막 입력 시각(performance.now) */
    inputAt: 0,
    /** 0 ~ 1. 공전이 붙어 있는 정도 */
    amount: 0,
    heading: 0,
    target: 0,
    turnAt: 0,
    anchorYaw: 0,
    anchorPitch: 0,
  }
  const yawRange = degToRad(idleConfig.yawRangeDeg)
  const pitchRange = degToRad(idleConfig.pitchRangeDeg)

  /** 입력이 들어왔다: 공전을 멈추고 대기 시간을 다시 센다 */
  const touch = () => {
    idle.inputAt = performance.now()
  }

  /** 시작한 각도 기준으로 지금 얼마나 벗어나 있는가(타원을 원으로 편 값, 1이 가장자리) */
  const idleOffset = () => ({
    x: wrapAngle(goal.yaw - idle.anchorYaw) / yawRange,
    y: (goal.pitch - idle.anchorPitch) / pitchRange,
  })

  /** 범위 안의 한 지점을 골라 그쪽으로 향한다. 지금 방향과 충분히 다른 것을 고른다 */
  const chooseHeading = (now: number) => {
    const offset = idleOffset()
    const minTurn = degToRad(idleConfig.minTurnDeg)
    let heading = idle.heading
    for (let attempt = 0; attempt < TURN_TRIES; attempt++) {
      const radius = Math.sqrt(Math.random()) * 0.85
      const angle = Math.random() * TAU
      heading = Math.atan2(Math.sin(angle) * radius - offset.y, Math.cos(angle) * radius - offset.x)
      if (Math.abs(wrapAngle(heading - idle.heading)) >= minTurn) break
    }
    idle.target = idle.heading + wrapAngle(heading - idle.heading)
    idle.turnAt = now + idleConfig.turnEverySec * 1000
  }

  /** 가만히 있을 때: 정해 둔 방향으로 아주 천천히 돈다. 입력이 들어오면 곧 떨어지고 각도는 그대로 남는다 */
  const driftIdle = (dt: number, now: number, background: number) => {
    const turning = Math.hypot(velocity.yaw, velocity.pitch) * cameraView.focal > config.minInertia
    const still = now - Math.max(idle.inputAt, pointer.movedAt) > idleConfig.delayMs
    const want = idle.allowed && !tween && !held && !turning && still && background > 0
    if (want && idle.amount === 0) {
      // 새로 시작: 지금 각도를 중심으로 삼고, 아무 쪽(위아래 · 사선 포함)으로나 출발한다
      idle.anchorYaw = goal.yaw
      idle.anchorPitch = goal.pitch
      idle.heading = idle.target = Math.random() * TAU
      idle.turnAt = now + idleConfig.turnEverySec * 1000
    }
    idle.amount += ((want ? 1 : 0) - idle.amount) * follow(dt, want ? idleConfig.easeInMs : idleConfig.easeOutMs)
    if (!want && idle.amount < 0.001) idle.amount = 0
    if (idle.amount === 0) return

    // 1분마다 새 방향. 범위 밖으로 나가는 중이면 그 전에 안쪽으로 돌아선다
    const offset = idleOffset()
    const outward = Math.cos(idle.target) * offset.x + Math.sin(idle.target) * offset.y > 0
    if (now >= idle.turnAt || (Math.hypot(offset.x, offset.y) > 1 && outward)) chooseHeading(now)
    idle.heading += (idle.target - idle.heading) * follow(dt, idleConfig.turnMs)

    const step = (degToRad(idleConfig.speedDegPerSec) / 1000) * dt * idle.amount * background
    goal.yaw += Math.cos(idle.heading) * step
    goal.pitch += Math.sin(idle.heading) * step * (pitchRange / yawRange)
    clampGoal()
  }

  const stop = () => {
    velocity.x = velocity.y = velocity.z = velocity.yaw = velocity.pitch = 0
  }

  const clampGoal = () => {
    goal.pitch = clamp(goal.pitch, -PITCH_LIMIT, PITCH_LIMIT)
    if (!limits) return
    const pad = config.boundsPadding
    goal.zoom = clamp(goal.zoom, limits.zoomMin, limits.zoomMax)
    goal.x = clamp(goal.x, limits.bounds.minX - pad, limits.bounds.maxX + pad)
    goal.y = clamp(goal.y, limits.bounds.minY - pad, limits.bounds.maxY + pad)
  }

  /** 화면의 오른쪽 · 아래로 sx · sy(world)만큼 초점을 옮긴다(지금 방향 기준) */
  const shiftFocus = (sx: number, sy: number) => {
    const { right: r, down: d } = cameraView
    goal.x += r[0] * sx + d[0] * sy
    goal.y += r[1] * sx + d[1] * sy
    goal.z += r[2] * sx + d[2] * sy
  }

  return {
    setViewport(width, height) {
      cameraView.width = width
      cameraView.height = height
      cameraView.focal = config.focalRatio * ((width + height) / 2)
      orient()
    },

    setLimits(next) {
      limits = next
    },

    jumpTo(target) {
      touch()
      tween = null
      stop()
      Object.assign(goal, target)
      Object.assign(cameraView, target)
      orient()
    },

    flyTo(target, durationMs, ease = config.travelEase) {
      touch()
      stop()
      const to = {
        ...target,
        // 방향을 줬으면 가까운 쪽으로 돌아 그 방향에 닿는다
        yaw: target.yaw === undefined ? goal.yaw : goal.yaw + wrapAngle(target.yaw - goal.yaw),
        pitch: target.pitch ?? goal.pitch,
      }
      tween = { from: { ...goal }, to, start: performance.now(), duration: Math.max(durationMs, 1), ease }
    },

    current: () => ({ ...(tween ? tween.to : goal) }),

    grab() {
      touch()
      tween = null
      held = true
      stop()
    },

    orbitBy(dx, dy, elapsedMs) {
      touch()
      const yaw = -degToRad(dx * orbitDegPerPx)
      const pitch = degToRad(dy * orbitDegPerPx)
      goal.yaw += yaw
      goal.pitch += pitch
      clampGoal()
      const elapsed = Math.max(elapsedMs, 1)
      velocity.yaw = yaw / elapsed
      velocity.pitch = pitch / elapsed
    },

    panBy(dx, dy, elapsedMs) {
      touch()
      const sx = -dx / goal.zoom
      const sy = -dy / goal.zoom
      const before = { x: goal.x, y: goal.y, z: goal.z }
      shiftFocus(sx, sy)
      clampGoal()
      const elapsed = Math.max(elapsedMs, 1)
      velocity.x = (goal.x - before.x) / elapsed
      velocity.y = (goal.y - before.y) / elapsed
      velocity.z = (goal.z - before.z) / elapsed
    },

    release(carry) {
      touch()
      held = false
      if (!carry) stop()
    },

    zoomBy(factor) {
      touch()
      tween = null
      stop()
      goal.zoom = limits ? clamp(goal.zoom * factor, limits.zoomMin, limits.zoomMax) : goal.zoom * factor
      clampGoal()
    },

    goalZoom: () => goal.zoom,

    setIdleOrbit(allowed) {
      idle.allowed = allowed
    },

    update(dt, now) {
      if (tween) {
        const t = clamp((now - tween.start) / tween.duration, 0, 1)
        const eased = tween.ease(t)
        const { from, to } = tween
        goal.zoom = from.zoom * (to.zoom / from.zoom) ** eased
        // 도착 지점이 화면 위에서 일정하게 중심으로 다가오도록 위치를 정한다
        const remaining = ((1 - eased) * from.zoom) / goal.zoom
        goal.x = to.x - (to.x - from.x) * remaining
        goal.y = to.y - (to.y - from.y) * remaining
        goal.z = to.z - (to.z - from.z) * (1 - eased)
        goal.yaw = from.yaw + (to.yaw - from.yaw) * eased
        goal.pitch = from.pitch + (to.pitch - from.pitch) * eased
        if (t >= 1) tween = null
      } else if (!held) {
        // 무거운 카메라는 놓은 뒤 더 오래 미끄러진다
        const friction = config.inertiaFriction ** (dt / 16 / getMotion().weight)
        if (Math.hypot(velocity.x, velocity.y, velocity.z) * goal.zoom > config.minInertia) {
          goal.x += velocity.x * dt
          goal.y += velocity.y * dt
          goal.z += velocity.z * dt
          velocity.x *= friction
          velocity.y *= friction
          velocity.z *= friction
        }
        // 회전 관성: 화면에서 움직이는 정도(초점까지의 거리 기준 px)로 멈출지 정한다
        if (Math.hypot(velocity.yaw, velocity.pitch) * cameraView.focal > config.minInertia) {
          goal.yaw += velocity.yaw * dt
          goal.pitch += velocity.pitch * dt
          velocity.yaw *= friction
          velocity.pitch *= friction
        }
        clampGoal()
      }

      const { parallax, background, weight } = getMotion()
      driftIdle(dt, now, Math.min(background, 1))

      // 화면의 카메라는 목표를 약간 늦게 따라간다(무거울수록 더 늦게)
      const k = follow(dt, config.followMs * weight)
      cameraView.x += (goal.x - cameraView.x) * k
      cameraView.y += (goal.y - cameraView.y) * k
      cameraView.z += (goal.z - cameraView.z) * k
      cameraView.zoom *= (goal.zoom / cameraView.zoom) ** k
      cameraView.yaw += (goal.yaw - cameraView.yaw) * k
      cameraView.pitch += (goal.pitch - cameraView.pitch) * k

      // 마우스 시차 + 아주 느린 표류: 카메라가 옆으로 밀리면 가까운 것이 더 크게 움직인다
      const drift = config.idleDriftPx * background
      const shiftX =
        (pointer.active ? pointer.nx * config.parallaxShiftPx * parallax : 0) +
        Math.sin(now * config.idleDriftSpeed) * drift
      const shiftY =
        (pointer.active ? pointer.ny * config.parallaxShiftPx * parallax : 0) +
        Math.cos(now * config.idleDriftSpeed * 0.77) * drift
      const p = follow(dt, config.parallaxFollowMs * weight)
      cameraView.offsetX += (shiftX / cameraView.zoom - cameraView.offsetX) * p
      cameraView.offsetY += (shiftY / cameraView.zoom - cameraView.offsetY) * p
      orient()
    },
  }
}
