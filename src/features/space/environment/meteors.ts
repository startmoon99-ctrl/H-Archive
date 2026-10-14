import { spaceConfig } from '@/config/space'
import { between } from '@/utils/random'
import { cameraView, project, screenToDepthPlane, type Projected } from '../camera/cameraView'
import { STREAK_STRIDE } from './glRenderer'

/**
 * 별똥별: 멀리서 가는 빛줄기 하나가 천천히 지나가다 멈추며, 꼬리를 거두고 반짝인 뒤 사라진다.
 * 사라지는 모습은 config.bursts 중 하나를 무작위로 고른다(바로 앞과 같은 것은 피한다).
 * 한 번에 하나만 있다. 멀리(config.distance) 떨어진 공간에 놓고 매 프레임 카메라로 투영하므로,
 * 시점을 돌리면 먼 별과 함께 움직인다. 여기서는 화면 위의 사각형(빛줄기 · 사라지는 빛)과
 * 그 순간의 값만 만들고, 그리는 것은 glRenderer의 빛줄기 셰이더가 한다.
 */

const QUAD = 4
const MS_PER_SECOND = 1000
/** 꼬리가 다 자라는 때(지나가는 시간 대비) */
const TAIL_GROWN = 0.35

const config = spaceConfig.particles.meteors

/** 사라지는 모습. 순서가 셰이더의 uBurstKind 번호다(environment/shaders.ts) */
export const BURST_KINDS = ['cross', 'glint', 'flare', 'twice', 'embers'] as const
export type BurstKind = (typeof BURST_KINDS)[number]
type BurstConfig = (typeof config.bursts)[number]

type Vec3 = [number, number, number]

interface Meteor {
  start: number
  duration: number
  origin: Vec3
  /** 지나가는 방향(world, 길이 1) */
  direction: Vec3
  /** 움직이는 거리 · 꼬리 길이(world) */
  travel: number
  tail: number
  burst: BurstConfig
  /** 0 ~ 1. 불티가 흩어지는 모양처럼 별똥별마다 달라지는 값 */
  seed: number
}

export interface MeteorOptions {
  enabled: boolean
  /** 화면 배율. 넓은 화면에서 빛줄기가 작아 보이지 않게 곱한다 */
  scale: number
}

/** glRenderer가 그리는 한 프레임의 별똥별. vertices 앞쪽에 빛줄기, 그 뒤에 사라지는 빛의 꼭짓점이 있다 */
export interface MeteorFrame {
  readonly vertices: Float32Array
  readonly streakVertices: number
  readonly burstVertices: number
  /** 사라지는 빛: 모습 번호(BURST_KINDS) · 크기(px) · 진행(0 ~ 1) · 진행 방향(화면, 길이 1) · 별똥별마다 다른 값 */
  readonly burstKind: number
  readonly burstPx: number
  readonly burstPhase: number
  readonly burstDir: [number, number]
  readonly burstSeed: number
  /** 머리의 화면 위치(화면 중심 기준 px). 가리는 성단을 고를 때 쓴다 */
  readonly headX: number
  readonly headY: number
}

export interface Meteors extends MeteorFrame {
  /** 매 프레임 부른다. 결과는 MeteorFrame의 값에 쓴다 */
  update(now: number, options: MeteorOptions): void
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(Math.max((x - edge0) / (edge1 - edge0), 0), 1)
  return t * t * (3 - 2 * t)
}

/** 짧게 밝아졌다가(peak까지) 천천히 스러지는 밝기 */
function flash(phase: number, peak: number): number {
  return smoothstep(0, peak, phase) * (1 - smoothstep(peak, 1, phase))
}

/** 사라지는 빛의 밝기(0 ~ 1)와 크기 배율. 모양은 셰이더가, 시간에 따른 변화는 여기서 정한다 */
function burstShape(kind: BurstKind, phase: number): { light: number; size: number } {
  switch (kind) {
    case 'cross':
      return { light: flash(phase, 0.2), size: 0.6 + 0.4 * smoothstep(0, 0.3, phase) }
    case 'glint':
      return { light: flash(phase, 0.25), size: 0.5 + 0.5 * smoothstep(0, 0.35, phase) }
    case 'flare':
      // 앞으로 확 뻗었다가 스러진다
      return { light: flash(phase, 0.15), size: 0.4 + 0.6 * smoothstep(0, 0.25, phase) }
    case 'twice':
      // 한 번 반짝이고, 조금 약하게 한 번 더
      return {
        light: Math.max(flash(phase / 0.42, 0.35), 0.75 * flash((phase - 0.42) / 0.58, 0.3)),
        size: 0.7 + 0.3 * smoothstep(0, 0.2, phase),
      }
    case 'embers':
      // 불티는 셰이더가 진행(phase)으로 흩어 놓고 끈다. 여기서는 처음만 부드럽게 켠다
      return { light: smoothstep(0, 0.08, phase), size: 1 }
  }
}

function burstIndex(burst: BurstConfig): number {
  return BURST_KINDS.indexOf(burst.kind)
}

export function createMeteors(random: () => number = Math.random): Meteors {
  const vertices = new Float32Array(QUAD * 2 * STREAK_STRIDE)
  const head: Projected = { x: 0, y: 0, scale: 0, depth: 0 }
  const tail: Projected = { x: 0, y: 0, scale: 0, depth: 0 }
  let meteor: Meteor | null = null
  /** 다음 별똥별이 나타날 시각. 아직 정하지 않았으면 -1 */
  let next = -1
  let lastBurst: BurstConfig | null = null
  const frame = {
    streakVertices: 0,
    burstVertices: 0,
    burstKind: 0,
    burstPx: 0,
    burstPhase: 0,
    burstDir: [1, 0] as [number, number],
    burstSeed: 0,
    headX: 0,
    headY: 0,
  }

  /** 사라지는 모습을 무게에 따라 고른다. 바로 앞과 같은 것은 피한다 */
  const pickBurst = (): BurstConfig => {
    const usable = config.bursts.filter((burst) => burst.weight > 0)
    const others = usable.filter((burst) => burst !== lastBurst)
    const choices = others.length > 0 ? others : usable
    const total = choices.reduce((sum, burst) => sum + burst.weight, 0)
    let roll = random() * total
    for (const burst of choices) {
      roll -= burst.weight
      if (roll <= 0) return (lastBurst = burst)
    }
    return (lastBurst = choices[choices.length - 1])
  }

  const spawn = (now: number, scale: number): Meteor => {
    const angle = (between(random, config.angleDeg) * Math.PI) / 180
    const across = between(random, config.area.x)
    // 화면 가운데 쪽으로 날아가게 해, 사라지는 빛이 화면 밖에서 터지지 않게 한다
    const side = across < 0.5 ? 1 : -1
    const screenX = Math.cos(angle) * side
    const screenY = Math.sin(angle)
    const start = screenToDepthPlane(
      { x: cameraView.width * across, y: cameraView.height * between(random, config.area.y) },
      config.distance,
    )
    const { right, down } = cameraView
    // px → world: 그 거리에서 1px가 world로 얼마인가
    const perPx = (config.distance / cameraView.focal) * scale
    frame.burstDir = [screenX, screenY]
    return {
      start: now,
      duration: between(random, config.durationSec) * MS_PER_SECOND,
      origin: [start.x, start.y, start.z],
      direction: [
        right[0] * screenX + down[0] * screenY,
        right[1] * screenX + down[1] * screenY,
        right[2] * screenX + down[2] * screenY,
      ],
      travel: between(random, config.travelPx) * perPx,
      tail: between(random, config.tailPx) * perPx,
      burst: pickBurst(),
      seed: random(),
    }
  }

  /** 사각형 하나: 네 꼭짓점(x y · 밝기 · u v) */
  const writeQuad = (offset: number, corners: [number, number, number, number, number][]) => {
    corners.forEach((corner, index) => vertices.set(corner, (offset + index) * STREAK_STRIDE))
  }

  const draw = (current: Meteor, now: number, scale: number) => {
    const elapsed = now - current.start
    const progress = Math.min(elapsed / current.duration, 1)
    // 사라지는 빛의 진행(0 ~ 1). 빛줄기가 멈춘 뒤에 시작한다
    const burstMs = current.burst.durationSec * MS_PER_SECOND
    const burst = Math.min(Math.max((elapsed - current.duration) / burstMs, 0), 1)

    // 머리는 끝으로 갈수록 느려져 멈춘다. 꼬리는 처음에 자라났다가, 사라지는 빛이 시작되면 머리 쪽으로 거둬진다
    const reach = current.travel * Math.sin((progress * Math.PI) / 2)
    const length = current.tail * Math.min(progress / TAIL_GROWN, 1) * (1 - smoothstep(0, 0.5, burst))
    const { origin: o, direction: d } = current
    if (!project(o[0] + d[0] * reach, o[1] + d[1] * reach, o[2] + d[2] * reach, head)) return
    const cx = cameraView.width / 2
    const cy = cameraView.height / 2
    const hx = head.x - cx
    const hy = head.y - cy
    frame.headX = hx
    frame.headY = hy

    // 빛줄기
    const glow = config.alpha * smoothstep(0, 0.12, progress) * (1 - smoothstep(0, 0.5, burst))
    if (glow > 0.001 && length > 0) {
      const back = reach - length
      if (project(o[0] + d[0] * back, o[1] + d[1] * back, o[2] + d[2] * back, tail)) {
        const tx = tail.x - cx
        const ty = tail.y - cy
        const span = Math.hypot(hx - tx, hy - ty)
        if (span >= 0.5) {
          // 띠의 옆 방향과 반폭(px). 꼬리 끝으로 갈수록 가늘어진다
          const nx = -(hy - ty) / span
          const ny = (hx - tx) / span
          // 불티가 흩어질 방향: 지금 화면에서 나아가는 쪽
          frame.burstDir = [(hx - tx) / span, (hy - ty) / span]
          const half = (config.widthPx * scale) / 2
          const thin = half * 0.35
          writeQuad(0, [
            [tx - nx * thin, ty - ny * thin, 0, 0, -1],
            [tx + nx * thin, ty + ny * thin, 0, 0, 1],
            [hx - nx * half, hy - ny * half, glow, 0, -1],
            [hx + nx * half, hy + ny * half, glow, 0, 1],
          ])
          frame.streakVertices = QUAD
        }
      }
    }

    // 사라지는 빛: 멈춘 머리에서 반짝이고 사라진다
    if (burst > 0 && burst < 1) {
      const shape = burstShape(current.burst.kind, burst)
      const size = current.burst.sizePx * scale * shape.size
      const light = current.burst.alpha * shape.light
      writeQuad(frame.streakVertices, [
        [hx - size, hy - size, light, -1, -1],
        [hx + size, hy - size, light, 1, -1],
        [hx - size, hy + size, light, -1, 1],
        [hx + size, hy + size, light, 1, 1],
      ])
      frame.burstVertices = QUAD
      frame.burstKind = burstIndex(current.burst)
      frame.burstPx = size
      frame.burstPhase = burst
      frame.burstSeed = current.seed
    }
  }

  return {
    vertices,
    get streakVertices() {
      return frame.streakVertices
    },
    get burstVertices() {
      return frame.burstVertices
    },
    get burstKind() {
      return frame.burstKind
    },
    get burstPx() {
      return frame.burstPx
    },
    get burstPhase() {
      return frame.burstPhase
    },
    get burstDir() {
      return frame.burstDir
    },
    get burstSeed() {
      return frame.burstSeed
    },
    get headX() {
      return frame.headX
    },
    get headY() {
      return frame.headY
    },

    update(now, { enabled, scale }) {
      frame.streakVertices = 0
      frame.burstVertices = 0
      if (!enabled) {
        meteor = null
        next = -1
        return
      }
      if (!meteor) {
        if (next < 0) next = now + between(random, config.gapSec) * MS_PER_SECOND
        if (now < next) return
        meteor = spawn(now, scale)
        next = -1
      }
      if (now - meteor.start >= meteor.duration + meteor.burst.durationSec * MS_PER_SECOND) {
        meteor = null
        next = now + between(random, config.gapSec) * MS_PER_SECOND
        return
      }
      draw(meteor, now, scale)
    },
  }
}
