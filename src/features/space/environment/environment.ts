import { spaceConfig } from '@/config/space'
import { pointer } from '@/motion/pointer'
import { getMotion } from '@/motion/runtime'
import type { Point } from '@/types/ui'
import { readColorToken } from '@/utils/color'
import { cameraView, focusDistance } from '../camera/cameraView'
import { createQualityGovernor, renderRatio } from '../effects/quality'
import type { SpaceLayout } from '../scene/layout'
import { createGlRenderer } from './glRenderer'
import { buildParticleField } from './particleField'

const config = spaceConfig.particles
const { breath, interaction } = spaceConfig
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
  let size = { width: 1, height: 1 }
  /** 갑자기 켜지고 꺼지지 않도록 부드럽게 따라가는 값: 커서가 화면 안에 있는가 · 전체 보기인가 */
  let presence = 0
  let overviewAmount = 0
  let wrapStart = -Infinity
  let wrapDuration = 1

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
      renderer.setParticles(buildParticleField(layout, density, scale))
    },

    draw(dt, now, frame) {
      if (!frame.behind && quality.sample(dt)) applySize()
      const motion = getMotion()
      const k = follow(dt, interaction.proximityFollowMs)
      presence += ((pointer.active && !frame.behind ? 1 : 0) - presence) * k
      overviewAmount += ((frame.overview ? 1 : 0) - overviewAmount) * k
      const background = Math.min(motion.background, 1)
      const attention = presence * overviewAmount * Math.min(motion.mouseFollow, 1)

      // 감싸기: 이미지가 닿을 때까지 다가왔다가 천천히 풀린다
      const wrapProgress = (now - wrapStart) / wrapDuration
      const wrapAmount =
        frame.wrapPoint && wrapProgress < 1
          ? wrapProgress < WRAP_PEAK
            ? smoothstep(wrapProgress / WRAP_PEAK)
            : smoothstep((1 - wrapProgress) / (1 - WRAP_PEAK))
          : 0
      renderer.draw(
        {
          camera: [
            cameraView.x + cameraView.offsetX,
            cameraView.y + cameraView.offsetY,
            cameraView.z + focusDistance(),
          ],
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
          twinkle: config.twinkle * Math.min(motion.background, 1),
          lineColor,
        },
        quality.current().particles,
        frame.lines,
        frame.lineVertices,
      )
    },

    wrap(arriveMs) {
      wrapStart = performance.now()
      wrapDuration = Math.max(arriveMs, 1) / WRAP_PEAK
    },

    dispose() {
      renderer.dispose()
    },
  }
}
