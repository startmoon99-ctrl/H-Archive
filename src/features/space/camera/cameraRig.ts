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
/** 위아래로 떠가는 거리는 좌우의 이 비율. 화면이 가로로 넓어 위아래는 덜 움직여야 성단이 화면 안에 머문다 */
const DRIFT_VERTICAL = 0.5

type IdleLevel = (typeof idleConfig.levels)[number]

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
   * 허락돼 있어도 입력이 끊긴 지 config.idleOrbit.delayMs가 지나야 시작한다.
   * reach: 범위 · 빠르기 · 옆으로 떠가는 거리에 곱하는 배율(성단 안처럼 화면을 꽉 채운 구도에서 줄인다)
   */
  setIdleOrbit(allowed: boolean, level: number, reach?: number): void
  update(dt: number, now: number): void
}

interface Tween {
  from: Required<CameraGoal>
  to: Required<CameraGoal>
  start: number
  duration: number
  ease: (t: number) => number
  /** 출발할 때 가만히 있을 때의 공전으로 비켜서 있던 거리(px). 이동과 같은 곡선으로 0까지 줄인다 */
  panFrom: [number, number]
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
  /** 카메라가 옆으로 밀린 거리(초점면 px): 마우스 시차 · 느린 표류 · 가만히 있을 때 비켜선 거리를 부드럽게 따라간 값 */
  const shift = { x: 0, y: 0 }

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
    /** 이번에 떠돌기 시작한 시각. 다가갔다 물러나는 박자의 기준 */
    startedAt: 0,
    /**
     * 옆으로 비켜선 거리(초점면 px, 카메라의 오른쪽 · 아래 기준)와 그 목표. 회전의 중심(초점)은 옮기지 않고
     * 카메라만 비켜서므로(cameraView.offsetX/Y), 손으로 돌릴 때도 늘 성단(초점)을 축으로 돈다
     */
    panX: 0,
    panY: 0,
    panTargetX: 0,
    panTargetY: 0,
    /** 지금까지 물러난 정도(배율의 로그) */
    pull: 0,
    /** 한 번이라도 떠돈 적이 있는가. 처음에만 방향을 무작위로 정하고, 그 뒤로는 하던 방향을 잇는다 */
    started: false,
    /** 사용자가 각도나 자리를 직접 바꿨다: 다음에 떠돌 때 지금 각도를 새 중심으로 삼는다 */
    reanchor: true,
    level: idleConfig.levels[idleConfig.defaultLevel] as IdleLevel,
    /** 범위 · 빠르기 · 옆으로 떠가는 거리에 곱하는 배율(성단 안에서는 줄인다) */
    reach: 1,
  }
  const yawRange = () => degToRad(idle.level.yawRangeDeg) * idle.reach
  const pitchRange = () => degToRad(idle.level.pitchRangeDeg) * idle.reach

  /**
   * 입력이 들어왔다: 공전을 잠시 멈춘다(놓으면 delayMs 뒤에 이어진다).
   * moved: 각도나 보는 자리를 직접 바꿨다(돌리기 · 이동) → 그 자리를 새 중심으로. 누르기 · 놓기만으로는 중심을 그대로 둔다
   * zoomed: 배율을 직접 정했다 → 물러나 있던 만큼을 그 배율에 굳힌다
   */
  const touch = (moved = false, zoomed = false) => {
    idle.inputAt = performance.now()
    if (moved) {
      idle.reanchor = true
      // 직접 돌리거나 옮기면 비켜서 있던 카메라가 천천히 제자리로 돌아와 초점이 다시 화면 가운데에 온다
      idle.panTargetX = idle.panTargetY = 0
    }
    if (zoomed) idle.pull = 0
  }

  /** 시작한 각도 기준으로 지금 얼마나 벗어나 있는가(타원을 원으로 편 값, 1이 가장자리) */
  const idleOffset = () => ({
    x: wrapAngle(goal.yaw - idle.anchorYaw) / yawRange(),
    y: (goal.pitch - idle.anchorPitch) / pitchRange(),
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
    const still = now - idle.inputAt > idleConfig.delayMs
    const want = idle.allowed && idle.level.speedDegPerSec > 0 && !tween && !held && !turning && still && background > 0
    if (want && !idle.started) {
      // 처음: 아무 쪽(위아래 · 사선 포함)으로나 출발한다
      idle.heading = idle.target = Math.random() * TAU
      idle.turnAt = now + idleConfig.turnEverySec * 1000
      idle.startedAt = now
      idle.started = true
    }
    if (want && idle.reanchor) {
      // 사용자가 돌리거나 옮겼다: 그 자리를 새 중심으로 삼는다. 공전이 다 멈추기 전에 다시 이어져도 반드시 새로 잡는다
      // (옛 중심을 쓰면 직접 돌린 만큼을 범위를 벗어난 것으로 보고 크게 비켜서고 물러난다)
      idle.anchorYaw = goal.yaw
      idle.anchorPitch = goal.pitch
      idle.reanchor = false
    }
    // 그 밖에는 하던 방향 · 중심 · 박자를 그대로 이어 간다(누르기만 했을 때 방향이 바뀌거나 중심이 밀리지 않게)
    idle.amount += ((want ? 1 : 0) - idle.amount) * follow(dt, want ? idleConfig.easeInMs : idleConfig.easeOutMs)
    if (!want && idle.amount < 0.001) idle.amount = 0
    if (idle.amount === 0) return

    // 1분마다 새 방향. 범위 밖으로 나가는 중이면 그 전에 안쪽으로 돌아선다
    const offset = idleOffset()
    const outward = Math.cos(idle.target) * offset.x + Math.sin(idle.target) * offset.y > 0
    if (now >= idle.turnAt || (Math.hypot(offset.x, offset.y) > idleConfig.edge && outward)) chooseHeading(now)
    idle.heading += (idle.target - idle.heading) * follow(dt, idleConfig.turnMs)

    const strength = idle.amount * background
    const across = Math.cos(idle.heading)
    const along = Math.sin(idle.heading) * (pitchRange() / yawRange())
    const step = (degToRad(idle.level.speedDegPerSec) / 1000) * dt * strength * idle.reach
    goal.yaw += across * step
    goal.pitch += along * step

    // 멈추는 중(이동 · 끌기 · 휠)에는 도는 것만 서서히 잦아들고, 비켜선 거리 · 물러난 정도 · 숨은 건드리지 않는다.
    // 이동하는 동안 옛 중심으로 이 값들을 다시 계산하면 카메라가 엉뚱한 쪽으로 쏠렸다가 도착한 뒤에 되돌아온다
    if (!want) return

    // 도는 동안 옆으로도 떠간다. 도는 것만으로는 성단이 화면에 박힌 채 배경만 흐르므로,
    // 성단 무리도 배경과 같은 쪽으로(배경보다 느리게) 흘러가게 해 공간 전체가 함께 떠가는 것처럼 보이게 한다.
    // 옮겨 간 거리는 각도가 벗어난 만큼에 비례해(최대 driftRangePx) 각도가 돌아오면 함께 돌아오므로 화면 밖으로 밀려나지 않는다.
    // 회전의 중심은 그대로 두고 카메라만 비켜선다(update에서 offsetX/Y에 더한다)
    const turned = idleOffset()
    idle.panTargetX = -turned.x * idle.level.driftRangePx * idle.reach
    idle.panTargetY = turned.y * idle.level.driftRangePx * idle.reach * DRIFT_VERTICAL

    // 옆으로 돌아간 만큼 조금 물러나고, 돌아오면 다시 다가간다(원근으로 바깥 성단이 화면 밖으로 밀려나지 않게).
    // 중심이 새로 잡혀도 배율이 튀지 않도록 물러난 정도는 목표를 천천히 따라간다
    const pullTarget = Math.log(1 - idleConfig.pullBack * Math.min(turned.x * turned.x + turned.y * turned.y, 1))
    const pull = idle.pull + (pullTarget - idle.pull) * follow(dt, idleConfig.pullFollowMs)
    goal.zoom *= Math.exp(pull - idle.pull)
    idle.pull = pull

    // 아주 느리게 다가갔다 물러난다: 배율이 박자(breathSec)에 맞춰 ±breath만큼 오간다
    const beat = (TAU / (idleConfig.breathSec * 1000)) * (now - idle.startedAt)
    goal.zoom *= Math.exp(idle.level.breath * Math.cos(beat) * (TAU / (idleConfig.breathSec * 1000)) * dt * strength)
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
      touch(true, true)
      idle.panX = idle.panY = 0
      tween = null
      stop()
      Object.assign(goal, target)
      Object.assign(cameraView, target)
      orient()
    },

    flyTo(target, durationMs, ease = config.travelEase) {
      touch(true, true)
      stop()
      const to = {
        ...target,
        // 방향을 줬으면 가까운 쪽으로 돌아 그 방향에 닿는다
        yaw: target.yaw === undefined ? goal.yaw : goal.yaw + wrapAngle(target.yaw - goal.yaw),
        pitch: target.pitch ?? goal.pitch,
      }
      // 비켜서 있던 카메라도 이동과 같은 시간 · 곡선으로 제자리에 돌아와, 도착한 뒤 따로 정렬되지 않게 한다
      tween = {
        from: { ...goal },
        to,
        start: performance.now(),
        duration: Math.max(durationMs, 1),
        ease,
        panFrom: [idle.panX, idle.panY],
      }
    },

    current: () => ({ ...(tween ? tween.to : goal) }),

    grab() {
      touch()
      tween = null
      held = true
      stop()
    },

    orbitBy(dx, dy, elapsedMs) {
      touch(true)
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
      touch(true)
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
      touch(false, true)
      tween = null
      stop()
      goal.zoom = limits ? clamp(goal.zoom * factor, limits.zoomMin, limits.zoomMax) : goal.zoom * factor
      clampGoal()
    },

    goalZoom: () => goal.zoom,

    setIdleOrbit(allowed, level, reach = 1) {
      idle.allowed = allowed
      idle.reach = reach
      idle.level = idleConfig.levels[clamp(Math.round(level), 0, idleConfig.levels.length - 1)]
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
        idle.panX = tween.panFrom[0] * (1 - eased)
        idle.panY = tween.panFrom[1] * (1 - eased)
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
      const settle = follow(dt, idleConfig.pullFollowMs)
      idle.panX += (idle.panTargetX - idle.panX) * settle
      idle.panY += (idle.panTargetY - idle.panY) * settle

      // 화면의 카메라는 목표를 약간 늦게 따라간다(무거울수록 더 늦게)
      const k = follow(dt, config.followMs * weight)
      cameraView.x += (goal.x - cameraView.x) * k
      cameraView.y += (goal.y - cameraView.y) * k
      cameraView.z += (goal.z - cameraView.z) * k
      cameraView.zoom *= (goal.zoom / cameraView.zoom) ** k
      cameraView.yaw += (goal.yaw - cameraView.yaw) * k
      cameraView.pitch += (goal.pitch - cameraView.pitch) * k

      // 마우스 시차 + 아주 느린 표류 + 가만히 있을 때 비켜선 거리: 카메라가 옆으로 밀리면 가까운 것이 더 크게 움직인다.
      // 초점(회전의 중심)은 그대로이므로 손으로 돌려도 늘 초점을 축으로 돈다
      const drift = config.idleDriftPx * background
      const shiftX =
        (pointer.active ? pointer.nx * config.parallaxShiftPx * parallax : 0) +
        Math.sin(now * config.idleDriftSpeed) * drift +
        idle.panX
      const shiftY =
        (pointer.active ? pointer.ny * config.parallaxShiftPx * parallax : 0) +
        Math.cos(now * config.idleDriftSpeed * 0.77) * drift +
        idle.panY
      // 화면 px로 따라간 뒤 지금 배율로 world로 바꾼다. world로 따라가면 확대하는 동안 늦게 따라온 값이 배율만큼 커져
      // 도착한 뒤에도 화면이 한동안 미끄러진다
      const p = follow(dt, config.parallaxFollowMs * weight)
      shift.x += (shiftX - shift.x) * p
      shift.y += (shiftY - shift.y) * p
      cameraView.offsetX = shift.x / cameraView.zoom
      cameraView.offsetY = shift.y / cameraView.zoom
      orient()
    },
  }
}
