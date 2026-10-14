import { APP } from './app'

export interface IntroStep {
  id: string
  text: string
  /** ms */
  in: number
  hold: number
  out: number
}

export interface IntroSequence {
  /** 첫 글자가 나오기 전 검은 화면 */
  leadMs: number
  steps: IntroStep[]
  /** 글자가 사라진 뒤 카메라가 공간으로 다가오는 시간 */
  revealMs: number
  /** Skip했을 때 카메라가 공간으로 다가오는 시간 */
  skipRevealMs: number
}

/**
 * 인트로는 하나다. 접속할 때 자동으로, 설정의 "인트로 다시 보기"로 다시, 언제나 이 순서 그대로 재생한다:
 * 검은 화면 → H ARCHIVE → MY CREATIVE HISTORY → 공간으로 진입.
 */
export const introSequence: IntroSequence = {
  leadMs: 700,
  steps: [
    { id: 'title', text: APP.name, in: 2000, hold: 1500, out: 1200 },
    { id: 'tagline', text: APP.tagline, in: 1500, hold: 1300, out: 1000 },
  ],
  revealMs: 3000,
  skipRevealMs: 1300,
}

/** 글자가 하나씩 떠오르는 간격이 in 시간에서 차지하는 비율 */
export const INTRO_LETTER_SPREAD = 0.3
