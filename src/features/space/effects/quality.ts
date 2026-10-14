import { spaceConfig } from '@/config/space'

const config = spaceConfig.quality

export type QualityStep = (typeof config.steps)[number]

export interface QualityGovernor {
  /** 지금 단계 */
  current(): QualityStep
  /** 매 프레임 호출한다. 단계가 바뀌었으면 true */
  sample(dt: number): boolean
}

/**
 * 렌더 품질 조절기. 프레임이 계속 느리면 한 단계 낮추고, 충분히 여유가 이어지면 다시 올린다.
 * 화면이 4K여도 기기가 감당하는 만큼만 해상도와 입자를 쓴다.
 */
export function createQualityGovernor(touchDevice: boolean): QualityGovernor {
  let index = touchDevice ? config.touchStartStep : 0
  /** 최근 프레임 시간의 이동 평균(ms) */
  let average = 16
  let slowFor = 0
  let fastFor = 0

  return {
    current: () => config.steps[index],

    sample(dt) {
      average += (dt - average) * 0.05
      slowFor = average > config.slowFrameMs ? slowFor + dt : 0
      fastFor = average < config.fastFrameMs ? fastFor + dt : 0

      if (slowFor > config.downAfterMs && index < config.steps.length - 1) {
        index += 1
        slowFor = fastFor = 0
        return true
      }
      if (fastFor > config.upAfterMs && index > 0) {
        index -= 1
        slowFor = fastFor = 0
        return true
      }
      return false
    },
  }
}

/** 화면 크기에서 실제로 그릴 해상도 배율: 기기 배율 × 품질 단계, 픽셀 상한 안에서 */
export function renderRatio(width: number, height: number, step: QualityStep): number {
  const budget = Math.sqrt(config.maxPixels / (width * height))
  return Math.min(window.devicePixelRatio || 1, budget) * step.renderScale
}
