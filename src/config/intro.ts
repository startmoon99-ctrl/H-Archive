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
  /** 글자가 사라진 뒤 카메라가 은하로 다가오는 시간 */
  revealMs: number
}

export type IntroMode = 'full' | 'quick'

/** full: 첫 방문의 시네마틱 인트로 / quick: 재방문 · 움직임 최소화 · Skip */
export const introSequences: Record<IntroMode, IntroSequence> = {
  full: {
    leadMs: 700,
    steps: [
      { id: 'title', text: APP.name, in: 2000, hold: 1500, out: 1200 },
      { id: 'tagline', text: APP.tagline, in: 1500, hold: 1300, out: 1000 },
    ],
    revealMs: 3000,
  },
  quick: {
    leadMs: 80,
    steps: [{ id: 'title', text: APP.name, in: 520, hold: 280, out: 420 }],
    revealMs: 1300,
  },
}

/** 글자가 하나씩 나타나는 간격이 in 시간에서 차지하는 비율 */
export const INTRO_LETTER_SPREAD = 0.55
