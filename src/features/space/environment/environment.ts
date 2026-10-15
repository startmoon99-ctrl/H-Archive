import { spaceConfig } from '@/config/space'
import { pointer } from '@/motion/pointer'
import { getMotion } from '@/motion/runtime'
import type { Point } from '@/types/ui'
import { readColorToken } from '@/utils/color'
import { cameraView, focusDistance, project, type Projected } from '../camera/cameraView'
import { createQualityGovernor, renderRatio } from '../effects/quality'
import type { MovingCluster } from '../scene/arrangement'
import type { SpaceLayout } from '../scene/layout'
import { createGlRenderer } from './glRenderer'
import { createMeteors } from './meteors'
import { buildParticleField } from './particleField'
import { MAX_COVERS, MAX_MOVES } from './shaders'

const config = spaceConfig.particles
const meteorConfig = config.meteors
const backdropConfig = config.backdrop
const { twinkle, sparkle, screen, levels, driftPeriodSec } = config.stars
const { breath, interaction, arrange } = spaceConfig
const MS_PER_SECOND = 1000
/** 감싸는 세기가 가장 커지는 시점(전체 시간 대비). 작품의 이미지가 제자리에 닿는 때와 맞춘다 */
const WRAP_PEAK = 0.62

/** 장면이 매 프레임 알려 주는 것 */
export interface EnvironmentFrame {
  /** 성단과 작품을 잇는 선(x y z alpha 반복)과 꼭짓점 수 */
  lines: Float32Array
  lineVertices: number
  /** 전체 보기인가. 성단의 입자는 전체 보기에서만 커서를 알아차린다 */
  overview: boolean
  /** wrap()으로 시작한 감싸기가 모이는 화면 지점. 없으면 감싸지 않는다 */
  wrapPoint: Point | null
  /**
   * 상세 화면 뒤에서 그린다: 빈도를 낮춰 그리므로 품질 단계를 바꾸지 않고,
   * 커서에 밀려나는 반응도 하지 않는다(글을 읽는 데 방해되지 않게).
   */
  behind?: boolean
  /** 배치와 다른 자리로 옮겨 가는 성단. 입자 무리도 함께 옮긴다 */
  moving?: MovingCluster[]
}

function follow(dt: number, timeMs: number): number {
  return 1 - Math.exp(-dt / timeMs)
}

function smoothstep(t: number): number {
  const x = Math.min(Math.max(t, 0), 1)
  return x * x * (3 - 2 * x)
}

export interface Environment {
  resize(width: number, height: number): void
  /** 성단 배치나 입자 밀도가 바뀌면 입자를 다시 만든다 */
  rebuild(layout: SpaceLayout, density: number, scale: number): void
  /**
   * 별빛 설정: 생동감 단계(config의 stars.levels 번호)와 별똥별.
   * 반짝이는 별의 비율이 달라지면 입자를 다시 만든다(점의 자리는 그대로다)
   */
  setSky(level: number, meteors: boolean): void
  draw(dt: number, now: number, frame: EnvironmentFrame): void
  /** 주변 입자가 한 지점으로 다가왔다가 풀린다(상세 화면에서 돌아온 작품을 감싼다). arriveMs 뒤에 가장 가까이 모인다 */
  wrap(arriveMs: number): void
  dispose(): void
}

/**
 * 배경 환경: 입자와 선을 카메라에 맞춰 그리고, 프레임 속도에 따라 품질을 조절한다.
 * 장면(DOM)과는 카메라 상태(cameraView)만 공유하므로 통째로 다른 배경으로 바꿀 수 있다.
 */
export function createEnvironment(canvas: HTMLCanvasElement, touchDevice: boolean): Environment | null {
  const renderer = createGlRenderer(canvas)
  if (!renderer) return null

  const quality = createQualityGovernor(touchDevice)
  const lineColor = readColorToken('--particle-thread')
  const streakColor = readColorToken('--particle-star')
  const meteors = createMeteors()
  /** 가장 뒤의 파노라마를 올린 시각(나타나는 정도의 기준). 아직 없으면 -1 */
  let backdropAt = -1
  let disposed = false

  // 가장 뒤의 파노라마: 화면을 막지 않게 따로 받아 풀고, 다 되면 천천히 나타난다.
  // 터치 기기는 작은 이미지를 쓰고, 이 기기가 올릴 수 없을 만큼 크면 줄여서 올린다
  const loadBackdrop = async () => {
    if (!backdropConfig.enabled) return
    try {
      const response = await fetch(touchDevice ? backdropConfig.srcLow : backdropConfig.src)
      if (!response.ok) throw new Error(`${response.status} ${response.url}`)
      const blob = await response.blob()
      let image = await createImageBitmap(blob, { premultiplyAlpha: 'none', colorSpaceConversion: 'none' })
      const limit = renderer.maxTextureSize
      if (image.width > limit) {
        const height = Math.round((limit * image.height) / image.width)
        image.close()
        image = await createImageBitmap(blob, { resizeWidth: limit, resizeHeight: height, resizeQuality: 'high' })
      }
      if (disposed) {
        image.close()
        return
      }
      renderer.setBackdrop(image)
      image.close()
      backdropAt = performance.now()
    } catch (error) {
      if (import.meta.env.DEV) console.warn('[backdrop] 배경 이미지를 불러오지 못했습니다.', error)
    }
  }
  void loadBackdrop()
  let sky = { level: 0, meteors: false }
  /** 마지막으로 입자를 만든 입력. 별빛 단계가 바뀌면 같은 입력으로 다시 만든다 */
  let built: { layout: SpaceLayout; density: number; scale: number } | null = null
  let size = { width: 1, height: 1 }
  /** 갑자기 켜지고 꺼지지 않도록 부드럽게 따라가는 값: 커서가 화면 안에 있는가 · 전체 보기인가 */
  let presence = 0
  let overviewAmount = 0
  let wrapStart = -Infinity
  let wrapDuration = 1
  /** 입자를 만들 때의 성단 중심. 옮겨 가는 성단의 입자를 이 자리에서 지금 자리로 옮겨 그린다 */
  const builtHomes = new Map<string, [number, number, number]>()
  const moveFrom = new Float32Array(MAX_MOVES * 4)
  const moveBy = new Float32Array(MAX_MOVES * 3)
  const moveVelocity = new Float32Array(MAX_MOVES * 3)

  const fillMoves = (moving: MovingCluster[] | undefined) => {
    moveFrom.fill(0)
    moveBy.fill(0)
    moveVelocity.fill(0)
    let slot = 0
    for (const cluster of moving ?? []) {
      const home = builtHomes.get(cluster.id)
      if (!home || slot >= MAX_MOVES) continue
      moveFrom.set([home[0], home[1], home[2], 1], slot * 4)
      moveBy.set([cluster.x - home[0], cluster.y - home[1], cluster.z - home[2]], slot * 3)
      moveVelocity.set([cluster.vx, cluster.vy, cluster.vz], slot * 3)
      slot++
    }
  }

  /** 별똥별을 가리는 성단: 별똥별의 머리에 가까운 순서로 MAX_COVERS개(화면 중심 기준 px) */
  const covers = new Float32Array(MAX_COVERS * 4)
  let coverCount = 0
  const projected: Projected = { x: 0, y: 0, scale: 0, depth: 0 }
  const candidates: { x: number; y: number; radius: number; gap: number }[] = []

  const fillCovers = (moving: MovingCluster[] | undefined) => {
    coverCount = 0
    if (!built || meteors.streakVertices + meteors.burstVertices === 0) return
    candidates.length = 0
    const cx = cameraView.width / 2
    const cy = cameraView.height / 2
    for (const cluster of built.layout.clusters) {
      // 옮기는 중인 성단은 지금 자리에서 가린다
      const at = moving?.find((item) => item.id === cluster.category.id) ?? cluster
      if (!project(at.x, at.y, at.z, projected)) continue
      const x = projected.x - cx
      const y = projected.y - cy
      const radius = cluster.radius * meteorConfig.behindClusters.radiusFactor * projected.scale
      candidates.push({ x, y, radius, gap: Math.hypot(x - meteors.headX, y - meteors.headY) - radius })
    }
    candidates.sort((a, b) => a.gap - b.gap)
    for (const cover of candidates.slice(0, MAX_COVERS)) {
      covers.set([cover.x, cover.y, cover.radius, meteorConfig.behindClusters.strength], coverCount * 4)
      coverCount++
    }
  }

  const applySize = () => {
    renderer.resize(size.width, size.height, renderRatio(size.width, size.height, quality.current()))
    // 화면에 얹는 효과(effects/PostEffects)도 같은 단계를 따른다
    document.documentElement.dataset.grain = String(quality.current().grain)
  }

  return {
    resize(width, height) {
      size = { width, height }
      applySize()
    },

    rebuild(layout, density, scale) {
      built = { layout, density, scale }
      renderer.setParticles(buildParticleField(layout, density, scale, levels[sky.level].twinkleShare))
      builtHomes.clear()
      for (const cluster of layout.clusters) builtHomes.set(cluster.category.id, [cluster.x, cluster.y, cluster.z])
    },

    setSky(level, meteorsOn) {
      const next = { level: Math.min(Math.max(level, 0), levels.length - 1), meteors: meteorsOn }
      const reshape = levels[next.level].twinkleShare !== levels[sky.level].twinkleShare
      sky = next
      if (reshape && built) this.rebuild(built.layout, built.density, built.scale)
    },

    draw(dt, now, frame) {
      if (!frame.behind && quality.sample(dt)) applySize()
      const motion = getMotion()
      const k = follow(dt, interaction.proximityFollowMs)
      presence += ((pointer.active && !frame.behind ? 1 : 0) - presence) * k
      overviewAmount += ((frame.overview ? 1 : 0) - overviewAmount) * k
      const background = Math.min(motion.background, 1)
      const star = levels[sky.level]
      // 별똥별은 상세 화면 뒤(글을 읽는 데 방해되지 않게)와 움직임이 꺼졌을 때(동작 줄이기)는 나타나지 않는다
      meteors.update(now, { enabled: sky.meteors && !frame.behind && background > 0, scale: built?.scale ?? 1 })
      fillCovers(frame.moving)
      const attention = presence * overviewAmount * Math.min(motion.mouseFollow, 1)

      // 감싸기: 이미지가 닿을 때까지 다가왔다가 천천히 풀린다
      fillMoves(frame.moving)
      const wrapProgress = (now - wrapStart) / wrapDuration
      const wrapAmount =
        frame.wrapPoint && wrapProgress < 1
          ? wrapProgress < WRAP_PEAK
            ? smoothstep(wrapProgress / WRAP_PEAK)
            : smoothstep((1 - wrapProgress) / (1 - WRAP_PEAK))
          : 0
      renderer.draw(
        {
          camera: cameraView.position,
          right: cameraView.right,
          down: cameraView.down,
          back: cameraView.back,
          focal: cameraView.focal,
          near: spaceConfig.camera.near,
          focusDistance: focusDistance(),
          time: now / MS_PER_SECOND,
          drift: config.drift * motion.background,
          pointer: [
            pointer.x - size.width / 2,
            pointer.y - size.height / 2,
            presence * Math.min(motion.mouseFollow, 1.5),
          ],
          repelRadius: config.repelRadiusPx,
          repelPx: config.repelPx,
          breath: [breath.periodSec[0], breath.periodSec[1], breath.radius * background, breath.glow * background],
          aware: [interaction.clusterSenseReachPx, interaction.clusterReachPx, attention, interaction.clusterLeanPx],
          awareEffect: [config.aware.glow, config.aware.gather, config.aware.drift],
          wrap: [
            (frame.wrapPoint?.x ?? 0) - size.width / 2,
            (frame.wrapPoint?.y ?? 0) - size.height / 2,
            wrapAmount * Math.min(motion.intensity, 1),
          ],
          wrapRadius: config.wrapRadiusPx,
          wrapPx: config.wrapPx,
          blurPx: config.blurPx,
          maxPoint: config.maxPointPx,
          glow: 0.45 + 0.55 * motion.glow,
          twinkle: config.twinkle * background,
          // 별의 움직임은 별빛 단계와 Background Motion을 따른다. 동작 줄이기(0)에서는 멈춘 점이 되고 빛살도 내지 않는다
          starPeriod: [star.microPeriodSec[0], star.microPeriodSec[1], star.twinklePeriodSec[0], star.twinklePeriodSec[1]],
          starFade: [star.microFade * background, star.twinkleFade * background, star.twinkleGrow * background, star.twinkleGlow],
          starHalo: twinkle.halo,
          twinkleLift: star.twinkleLift * background,
          starDrift: [star.driftPx * background, driftPeriodSec[0], driftPeriodSec[1]],
          sparkle: [star.flareSlotSec, sparkle.count, star.flareChance * background, sparkle.rays],
          flareSec: [sparkle.flareSec[0], sparkle.flareSec[1]],
          starShare: Math.min(1, (cameraView.focal / screen.referenceFocalPx) ** screen.power),
          lineColor,
          streakColor,
          covers,
          coverCount,
          coverInner: meteorConfig.behindClusters.inner,
          moveFrom,
          moveBy,
          moveVelocity,
          trail: [arrange.trailSec[0], arrange.trailSec[1], arrange.trailMax],
        },
        quality.current().particles,
        frame.lines,
        frame.lineVertices,
        meteors,
        {
          yawOffset: (backdropConfig.yawOffsetDeg * Math.PI) / 180,
          tone: [
            backdropConfig.brightness,
            backdropConfig.saturation,
            backdropAt < 0 ? 0 : smoothstep((now - backdropAt) / backdropConfig.fadeInMs),
          ],
        },
      )
    },

    wrap(arriveMs) {
      wrapStart = performance.now()
      wrapDuration = Math.max(arriveMs, 1) / WRAP_PEAK
    },

    dispose() {
      disposed = true
      renderer.dispose()
    },
  }
}
