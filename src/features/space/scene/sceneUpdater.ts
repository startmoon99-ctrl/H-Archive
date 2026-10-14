import { spaceConfig } from '@/config/space'
import { pointer } from '@/motion/pointer'
import { getMotion } from '@/motion/runtime'
import type { TravelOrigin } from '@/store/uiStore'
import type { ID } from '@/types/archive'
import { clamp } from '@/utils/math'
import { project, type Projected } from '../camera/cameraView'
import { LINE_STRIDE } from '../environment/glRenderer'
import type { ClusterLayout, PlacedNode, SpaceLayout } from './layout'

const { interaction, float, threads, camera, breath } = spaceConfig
const OFFSCREEN_MARGIN_PX = 400
/** 이보다 작은 변화는 DOM에 쓰지 않는다 */
const EPSILON = 0.004
const BREATH_EPSILON = 0.04
const LEAN_EPSILON_PX = 0.05
/** 커서가 중심에 이만큼 가까워지면 기우는 방향이 흔들리지 않게 기울기를 줄인다(px) */
const LEAN_SETTLE_PX = 28
const TAU = Math.PI * 2

/** 장면이 매 프레임 위치를 옮겨 주는 DOM 요소들. 컴포넌트가 ref로 등록한다. */
export interface SceneElements {
  clusters: Map<ID, HTMLElement>
  nodes: Map<ID, HTMLElement>
}

/** 요소마다 마지막으로 쓴 값. 달라졌을 때만 다시 쓴다 */
interface Written {
  x: number
  y: number
  scale: number
  /** DOM에 쓴 가까움과, 매 프레임 부드럽게 갱신되는 실제 값 */
  near: number
  nearSmooth: number
  sense: number
  senseSmooth: number
  leanX: number
  leanY: number
  leanSmoothX: number
  leanSmoothY: number
  breath: number
  fade: number
  layer: number
  visible: boolean
}

export interface SceneFrame {
  layout: SpaceLayout
  focusedId: ID | null
  activeNodeId: ID | null
  touchUi: boolean
  /** 전체 보기인가. 성단은 전체 보기에서만 커서에 반응한다 */
  overview: boolean
}

export interface SceneUpdater {
  /** 요소의 위치를 갱신하고, 그릴 선의 꼭짓점 수를 돌려준다(값은 lines에 있다) */
  update(frame: SceneFrame, dt: number, now: number): number
  /** 마지막 프레임에 그 작품의 프레임이 놓인 화면 자리. 화면에 없으면 null */
  rectOf(projectId: ID): TravelOrigin | null
  readonly lines: Float32Array
}

function follow(dt: number, timeMs: number): number {
  return 1 - Math.exp(-dt / timeMs)
}

/**
 * 성단의 숨(-1 ~ 1). environment/shaders.ts의 식과 같아야 중심의 빛(DOM)과 입자 무리(WebGL)가 함께 숨 쉰다.
 * @param seed 성단마다 다른 0 ~ 1
 */
export function breathOf(seed: number, timeSec: number): number {
  const period = breath.periodSec[0] + (breath.periodSec[1] - breath.periodSec[0]) * seed
  return Math.sin((timeSec * TAU) / period + seed * TAU * 5)
}

/**
 * 장면 갱신: 카메라를 거쳐 성단 · 작품의 화면 위치를 구해 DOM에 쓴다.
 * 여기서 정하는 것은 "어디에, 얼마나 크게, 커서와 얼마나 가까운가"까지다.
 * 그 값(--s · --near · --sense · --lean-* · --breath · data-*)을 받아 어떻게 빛나고 커질지는 effects/*.css가 정한다.
 */
export function createSceneUpdater(elements: SceneElements): SceneUpdater {
  const written = new WeakMap<HTMLElement, Written>()
  /** 작품의 프레임 크기(world). rectOf가 쓴다 */
  const frames = new Map<ID, PlacedNode>()
  /** 마지막 프레임에 선택돼 있던 작품. rectOf가 그 작품의 커진 크기를 계산할 때 쓴다 */
  let lastActiveId: ID | null = null
  const projected: Projected = { x: 0, y: 0, scale: 1, depth: 1 }
  let lines = new Float32Array(64 * LINE_STRIDE)
  /** 선이 서서히 나타나고 사라지는 정도 */
  let threadAmount = 0
  let threadCluster: ClusterLayout | null = null

  const stateOf = (element: HTMLElement): Written => {
    let state = written.get(element)
    if (!state) {
      state = {
        x: NaN,
        y: NaN,
        scale: NaN,
        near: 0,
        nearSmooth: 0,
        sense: 0,
        senseSmooth: 0,
        leanX: 0,
        leanY: 0,
        leanSmoothX: 0,
        leanSmoothY: 0,
        breath: 0,
        fade: NaN,
        layer: NaN,
        visible: true,
      }
      written.set(element, state)
    }
    return state
  }

  /** 화면 위치와 크기를 쓴다. 보이지 않으면 false */
  const place = (element: HTMLElement, state: Written, x: number, y: number, z: number): boolean => {
    const inFront = project(x, y, z, projected)
    const visible =
      inFront &&
      projected.x > -OFFSCREEN_MARGIN_PX &&
      projected.x < window.innerWidth + OFFSCREEN_MARGIN_PX &&
      projected.y > -OFFSCREEN_MARGIN_PX &&
      projected.y < window.innerHeight + OFFSCREEN_MARGIN_PX
    if (visible !== state.visible) {
      element.style.visibility = visible ? '' : 'hidden'
      state.visible = visible
    }
    if (!visible) return false

    // 처음에는 비교할 값이 없으므로(NaN) "차이가 작지 않으면 쓴다"로 판단한다
    if (!(Math.abs(projected.x - state.x) <= 0.02 && Math.abs(projected.y - state.y) <= 0.02)) {
      element.style.transform = `translate3d(${projected.x.toFixed(2)}px, ${projected.y.toFixed(2)}px, 0)`
      state.x = projected.x
      state.y = projected.y
    }
    if (!(Math.abs(projected.scale - state.scale) <= EPSILON * projected.scale)) {
      element.style.setProperty('--s', projected.scale.toFixed(4))
      state.scale = projected.scale
    }
    // 가까운 것이 위에 오도록
    const layer = Math.round(100000 / projected.depth)
    if (layer !== state.layer) {
      element.style.zIndex = String(layer)
      state.layer = layer
    }
    return true
  }

  /** 0 ~ 1 값 하나를 부드럽게 따라가게 한다. 목표에 거의 닿으면 정확한 값으로 맞춰 미세한 잔상이 남지 않게 한다 */
  const ease = (current: number, target: number, dt: number): number => {
    const next = current + (target - current) * follow(dt, interaction.proximityFollowMs)
    return Math.abs(target - next) < EPSILON ? target : next
  }

  /** 커서와의 가까움(0 ~ 1)을 부드럽게 따라가게 해서 쓴다 */
  const approach = (element: HTMLElement, state: Written, target: number, dt: number): number => {
    state.nearSmooth = ease(state.nearSmooth, target, dt)
    if (Math.abs(state.nearSmooth - state.near) > EPSILON || (state.nearSmooth === target && state.near !== target)) {
      element.style.setProperty('--near', state.nearSmooth.toFixed(3))
      state.near = state.nearSmooth
    }
    return state.nearSmooth
  }

  /** 멀리서 알아차린 정도(--sense)와 커서 쪽으로 기우는 거리(--lean-x · --lean-y) */
  const attend = (
    element: HTMLElement,
    state: Written,
    sense: number,
    leanX: number,
    leanY: number,
    dt: number,
  ): void => {
    state.senseSmooth = ease(state.senseSmooth, sense, dt)
    if (Math.abs(state.senseSmooth - state.sense) > EPSILON || (state.senseSmooth === sense && state.sense !== sense)) {
      element.style.setProperty('--sense', state.senseSmooth.toFixed(3))
      state.sense = state.senseSmooth
    }

    const k = follow(dt, interaction.proximityFollowMs)
    state.leanSmoothX += (leanX - state.leanSmoothX) * k
    state.leanSmoothY += (leanY - state.leanSmoothY) * k
    if (Math.abs(state.leanSmoothX) < LEAN_EPSILON_PX && leanX === 0) state.leanSmoothX = 0
    if (Math.abs(state.leanSmoothY) < LEAN_EPSILON_PX && leanY === 0) state.leanSmoothY = 0
    if (
      Math.abs(state.leanSmoothX - state.leanX) > LEAN_EPSILON_PX ||
      Math.abs(state.leanSmoothY - state.leanY) > LEAN_EPSILON_PX ||
      (state.leanSmoothX === 0 && state.leanSmoothY === 0 && (state.leanX !== 0 || state.leanY !== 0))
    ) {
      element.style.setProperty('--lean-x', state.leanSmoothX.toFixed(2))
      element.style.setProperty('--lean-y', state.leanSmoothY.toFixed(2))
      state.leanX = state.leanSmoothX
      state.leanY = state.leanSmoothY
    }
  }

  const pointerDistance = () => Math.hypot(projected.x - pointer.x, projected.y - pointer.y)

  const updateCluster = (cluster: ClusterLayout, frame: SceneFrame, dt: number, now: number) => {
    const element = elements.clusters.get(cluster.category.id)
    if (!element) return
    const state = stateOf(element)
    if (!place(element, state, cluster.x, cluster.y, cluster.z)) return

    const motion = getMotion()
    let near = 0
    let sense = 0
    let leanX = 0
    let leanY = 0
    if (frame.overview) {
      if (frame.touchUi) {
        // 터치에는 Hover가 없으므로 이름을 항상 보여준다
        near = 1
      } else if (pointer.active) {
        // 성단의 가장자리(반지름의 절반)부터 잰 거리로, 멀리서부터 단계적으로 반응한다
        const inner = cluster.radius * projected.scale * 0.5
        const distance = pointerDistance()
        const gap = distance - inner
        sense = clamp(1 - gap / interaction.clusterSenseReachPx, 0, 1)
        near = clamp(1 - gap / interaction.clusterReachPx, 0, 1)
        const lean =
          interaction.clusterLeanPx * near * Math.min(motion.mouseFollow, 1) * Math.min(distance / LEAN_SETTLE_PX, 1)
        if (lean > 0) {
          leanX = ((pointer.x - projected.x) / distance) * lean
          leanY = ((pointer.y - projected.y) / distance) * lean
        }
      }
    }
    approach(element, state, near, dt)
    attend(element, state, sense, leanX, leanY, dt)

    const pulse = breathOf(cluster.seed, now / 1000) * Math.min(motion.background, 1)
    if (Math.abs(pulse - state.breath) > BREATH_EPSILON) {
      element.style.setProperty('--breath', pulse.toFixed(2))
      state.breath = pulse
    }
  }

  const updateNode = (node: PlacedNode, frame: SceneFrame, focused: boolean, dt: number, now: number): number => {
    const element = elements.nodes.get(node.project.id)
    if (!element) return 0
    frames.set(node.project.id, node)
    const state = stateOf(element)
    // 제자리에서 천천히 떠 있는 움직임
    const sway = float.amplitude * getMotion().background
    const phase = now * float.speed * (0.6 + node.seed * 0.8) + node.seed * 40
    const x = node.x + Math.sin(phase) * sway
    const y = node.y + Math.cos(phase * 0.8) * sway
    if (!place(element, state, x, y, node.z)) return 0

    // 카메라가 통과할 만큼 가까워지면 사라진다
    const fade = clamp((projected.depth - camera.near * 1.5) / (camera.near * 5), 0, 1)
    if (!(Math.abs(fade - state.fade) <= EPSILON)) {
      element.style.setProperty('--fade', fade.toFixed(3))
      state.fade = fade
    }

    let target = 0
    if (focused) {
      if (node.project.id === frame.activeNodeId) target = 1
      else if (pointer.active && !frame.touchUi) {
        target = clamp(1 - pointerDistance() / interaction.nodeReachPx, 0, 1) ** 2
      }
    }
    return approach(element, state, target, dt)
  }

  return {
    get lines() {
      return lines
    },

    rectOf(projectId) {
      const element = elements.nodes.get(projectId)
      const node = frames.get(projectId)
      const state = element && written.get(element)
      if (!node || !state || !state.visible || Number.isNaN(state.x)) return null
      // 보이는 그대로의 크기: 선택됐거나 커서가 가까우면 effects가 키운 만큼 더한다(DOM을 재지 않는다)
      const { workActiveScale, workNearScale } = spaceConfig.effects
      const grown = (projectId === lastActiveId ? workActiveScale : 1) * (1 + state.near * workNearScale)
      const width = node.width * state.scale * grown
      const height = node.height * state.scale * grown
      return { x: state.x - width / 2, y: state.y - height / 2, width, height }
    },

    update(frame, dt, now) {
      lastActiveId = frame.activeNodeId
      const focusedCluster = frame.layout.clusters.find((cluster) => cluster.category.id === frame.focusedId) ?? null
      if (focusedCluster) threadCluster = focusedCluster
      threadAmount += ((focusedCluster ? 1 : 0) - threadAmount) * follow(dt, interaction.proximityFollowMs * 2)
      if (!focusedCluster && threadAmount < EPSILON) threadCluster = null

      let vertices = 0
      const needed = (threadCluster?.nodes.length ?? 0) * 2 * LINE_STRIDE
      if (needed > lines.length) lines = new Float32Array(needed * 2)

      for (const cluster of frame.layout.clusters) {
        updateCluster(cluster, frame, dt, now)
        const focused = cluster === focusedCluster
        for (const node of cluster.nodes) {
          const near = updateNode(node, frame, focused, dt, now)
          if (cluster !== threadCluster) continue
          const alpha = (threads.alpha + (threads.activeAlpha - threads.alpha) * near) * threadAmount
          lines.set([cluster.x, cluster.y, cluster.z, 0, node.x, node.y, node.z, alpha], vertices * LINE_STRIDE)
          vertices += 2
        }
      }
      return vertices
    },
  }
}
