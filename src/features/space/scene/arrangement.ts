import { spaceConfig } from '@/config/space'
import type { ID } from '@/types/archive'
import type { SpaceLayout } from './layout'

const config = spaceConfig.arrange
const MS_PER_SECOND = 1000
const PIN_FRAMES = 30

export interface Vec3 {
  x: number
  y: number
  z: number
}

/** 배치(layout)의 자리와 다른 곳에 있는 성단 하나. 손으로 끌고 있거나 새 자리로 내려앉는 중이다 */
interface Moving {
  current: Vec3
  target: Vec3
  /** world/s. 입자가 늦게 따라오는 꼬리의 방향과 길이에 쓴다 */
  velocity: Vec3
}

export interface MovingCluster extends Vec3 {
  id: ID
  vx: number
  vy: number
  vz: number
}

export interface Arrangement {
  /** 지금 이 성단이 보이는 자리. 배치 그대로면 null */
  positionOf(id: ID): Vec3 | null
  /** 배치와 다른 자리에 있는 성단들(입자 무리를 함께 옮길 때 쓴다) */
  moving(): MovingCluster[]
  /** 손으로 끄는 성단 */
  readonly heldId: ID | null
  /** 끌기 시작: from은 지금 보이는 자리 */
  hold(id: ID, from: Vec3): void
  /** 끄는 성단이 따라갈 자리 */
  moveTo(target: Vec3): void
  /** 놓았다. 놓은 자리는 저장한 뒤 배치가 따라온다 */
  release(): Vec3 | null
  /**
   * 매 프레임: 끄는 성단은 손을, 나머지는 배치의 자리를 감쇠하며 따라간다.
   * 배치가 바뀌면(놓음 · 취소 · 자동 배치 · 성단 추가) 성단이 그 자리로 부드럽게 옮겨 간다.
   */
  update(layout: SpaceLayout, dt: number): void
}

const distance = (a: Vec3, b: Vec3) => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)

function follow(dt: number, timeMs: number): number {
  return 1 - Math.exp(-dt / timeMs)
}

/**
 * 성단의 자리 옮기기. 배치(layout)는 저장된 자리만 알고, 옮겨 가는 동안의 자리는 여기 있다.
 * 장면(sceneUpdater)과 환경(입자)은 positionOf · moving만 읽는다.
 */
export function createArrangement(): Arrangement {
  const entries = new Map<ID, Moving>()
  /** 직전 프레임의 배치 자리. 바뀐 성단을 알아내 새 자리로 옮겨 가게 한다 */
  const base = new Map<ID, Vec3>()
  let heldId: ID | null = null
  /**
   * 막 놓은 성단: 놓은 자리가 저장돼 배치에 반영될 때까지(보통 한두 프레임) 그 자리를 지킨다.
   * 그 사이 예전 배치 자리로 잠깐 끌려가는 떨림을 막는다. 값은 남은 프레임 수
   */
  const pinned = new Map<ID, { at: Vec3; frames: number }>()

  return {
    get heldId() {
      return heldId
    },

    positionOf: (id) => entries.get(id)?.current ?? null,

    moving: () =>
      [...entries].map(([id, entry]) => ({
        id,
        ...entry.current,
        vx: entry.velocity.x,
        vy: entry.velocity.y,
        vz: entry.velocity.z,
      })),

    hold(id, from) {
      const entry = entries.get(id)
      if (entry) entry.target = { ...entry.current }
      else entries.set(id, { current: { ...from }, target: { ...from }, velocity: { x: 0, y: 0, z: 0 } })
      heldId = id
    },

    moveTo(target) {
      const entry = heldId ? entries.get(heldId) : undefined
      if (entry) entry.target = { ...target }
    },

    release() {
      const entry = heldId ? entries.get(heldId) : undefined
      if (entry && heldId) pinned.set(heldId, { at: { ...entry.target }, frames: PIN_FRAMES })
      heldId = null
      return entry ? { ...entry.target } : null
    },

    update(layout, dt) {
      // 없어진 성단은 잊는다
      const present = new Set(layout.clusters.map((cluster) => cluster.category.id))
      for (const id of base.keys()) {
        if (present.has(id)) continue
        base.delete(id)
        entries.delete(id)
        pinned.delete(id)
        if (heldId === id) heldId = null
      }

      for (const cluster of layout.clusters) {
        const id = cluster.category.id
        const next = { x: cluster.x, y: cluster.y, z: cluster.z }
        const before = base.get(id)
        base.set(id, next)
        const entry = entries.get(id)
        if (id === heldId) continue
        const pin = pinned.get(id)
        if (pin) {
          if (distance(pin.at, next) > config.settleEpsilon && --pin.frames > 0) continue
          pinned.delete(id)
        }
        if (entry) entry.target = next
        else if (before && distance(before, next) > config.settleEpsilon) {
          // 배치가 바뀌었다: 지금 자리에서 새 자리로 옮겨 간다
          entries.set(id, { current: before, target: next, velocity: { x: 0, y: 0, z: 0 } })
        }
      }

      const seconds = Math.max(dt, 1) / MS_PER_SECOND
      for (const [id, entry] of entries) {
        const k = follow(dt, id === heldId ? config.holdFollowMs : config.settleFollowMs)
        const { current, target, velocity } = entry
        const dx = (target.x - current.x) * k
        const dy = (target.y - current.y) * k
        const dz = (target.z - current.z) * k
        current.x += dx
        current.y += dy
        current.z += dz
        velocity.x = dx / seconds
        velocity.y = dy / seconds
        velocity.z = dz / seconds
        // 다 내려앉았으면 배치에 맡긴다
        if (id !== heldId && !pinned.has(id) && distance(current, target) < config.settleEpsilon) entries.delete(id)
      }
    },
  }
}
