import { APP } from './app'

export interface IntroStep {
  id: string
  text: string
  /** ms */
  in: number
  hold: number
  out: number
  /** 글의 앞부분 중 강조색(--color-mark)으로 칠할 글자 */
  accent?: string
}

export interface IntroSequence {
  /** 첫 글자가 나오기 전 검은 화면 */
  leadMs: number
  steps: IntroStep[]
  /**
   * 글자가 사라진 뒤 까만 화면으로 누르기를 기다린다. 브라우저는 사용자의 입력 전에는 소리를 막으므로
   * 이 입력으로 공간에 들어가며 음악이 함께 시작된다.
   */
  gate: {
    label: string
    /** 문구가 천천히 나타나는 시간 */
    fadeInMs: number
    /** 누른 뒤 문구가 사라지는 시간 */
    fadeOutMs: number
  }
  /** 누른 뒤 공간이 천천히 페이드인되는 시간(카메라가 다가오는 시간도 같다) */
  revealMs: number
  /** Skip했을 때 카메라가 공간으로 다가오는 시간 */
  skipRevealMs: number
}

/**
 * 인트로는 하나다. 접속할 때 자동으로, 설정의 "인트로 다시 보기"로 다시, 언제나 이 순서 그대로 재생한다:
 * 검은 화면 → H ARCHIVE → MY CREATIVE HISTORY → Open Archive(누르기) → 공간이 천천히 페이드인.
 * Skip은 입장 문구 없이 바로 공간으로 들어간다(그 클릭이 입력이 되어 음악도 시작된다).
 */
export const introSequence: IntroSequence = {
  leadMs: 700,
  steps: [
    { id: 'title', text: APP.name, in: 2000, hold: 1500, out: 1200, accent: 'H' },
    { id: 'tagline', text: APP.tagline, in: 1500, hold: 1300, out: 1000 },
  ],
  gate: { label: 'Open Archive', fadeInMs: 1800, fadeOutMs: 1000 },
  revealMs: 3600,
  skipRevealMs: 1300,
}

/** 글자가 하나씩 떠오르는 간격이 in 시간에서 차지하는 비율 */
export const INTRO_LETTER_SPREAD = 0.3
