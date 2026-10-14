/**
 * 모션의 단일 출처.
 * - motionTokens: 시간 · easing · 거리 같은 기준값
 * - motionPresets / motionControls: Motion Settings가 그대로 그리는 프리셋과 조절 항목
 * - projectMotion: 상세 화면의 모션 수치
 * 공간(장면)의 카메라 · 조작 · 입자 수치는 config/space.ts에 있다.
 * 실제 적용은 motion/runtime.ts가 맡는다(설정 배율을 곱해 CSS 변수와 JS 양쪽에 같은 값을 준다).
 */

export const motionTokens = {
  /** ms. 실제 시간은 Transition Speed 설정으로 나눈 값이다. */
  duration: {
    instant: 110,
    fast: 220,
    base: 400,
    slow: 760,
    travel: 1500,
    cinematic: 2400,
  },
  easing: {
    standard: 'cubic-bezier(0.2, 0, 0, 1)',
    enter: 'cubic-bezier(0.16, 1, 0.3, 1)',
    exit: 'cubic-bezier(0.7, 0, 0.84, 0)',
    cinematic: 'cubic-bezier(0.65, 0, 0.15, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
  /** ms. 연속 요소가 차례로 나타나는 간격 */
  stagger: 70,
  /** Reveal 기준값. Motion Intensity가 곱해진다. */
  reveal: { distance: 32, blur: 16, scale: 0.06 },
  magnetic: { strength: 0.28, maxShift: 14 },
  tilt: { maxDeg: 9 },
  cursorGlow: { smoothing: 0.11 },
  /** 평상시 움직임이 0이어도 0으로 나누지 않도록 하는 하한 */
  minAmbientRate: 0.05,
} as const

export type DurationToken = keyof typeof motionTokens.duration

export interface MotionSettings {
  /** 등장 · 전환 효과의 크기 */
  intensity: number
  parallax: number
  /** 별 · 먼지 입자 수 */
  particles: number
  glow: number
  tilt: number
  /** 평상시 배경 움직임(공전 · 반짝임 · 표류) 속도 */
  background: number
  /** 전환 속도. 클수록 빠르다. */
  speed: number
  mouseFollow: number
  previewAutoplay: boolean
}

export type MotionPresetId = 'calm' | 'cinematic' | 'immersive' | 'minimal'

export interface MotionPreset {
  id: MotionPresetId
  label: string
  description: string
  settings: MotionSettings
}

export const motionPresets: Record<MotionPresetId, MotionPreset> = {
  calm: {
    id: 'calm',
    label: 'CALM',
    description: '느린 움직임, 적은 입자, 약한 시차',
    settings: {
      intensity: 0.6,
      parallax: 0.4,
      particles: 0.5,
      glow: 0.7,
      tilt: 0.4,
      background: 0.5,
      speed: 0.85,
      mouseFollow: 0.4,
      previewAutoplay: true,
    },
  },
  cinematic: {
    id: 'cinematic',
    label: 'CINEMATIC',
    description: '강한 줌, 깊은 시차, 느리고 무게감 있는 전환',
    settings: {
      intensity: 1.1,
      parallax: 1.2,
      particles: 0.9,
      glow: 1,
      tilt: 0.8,
      background: 0.7,
      speed: 0.7,
      mouseFollow: 0.7,
      previewAutoplay: true,
    },
  },
  immersive: {
    id: 'immersive',
    label: 'IMMERSIVE',
    description: '마우스 반응과 입자, 공간 움직임을 강화',
    settings: {
      intensity: 1.2,
      parallax: 1.4,
      particles: 1.5,
      glow: 1.3,
      tilt: 1.2,
      background: 1.2,
      speed: 1,
      mouseFollow: 1.5,
      previewAutoplay: true,
    },
  },
  minimal: {
    id: 'minimal',
    label: 'MINIMAL',
    description: '움직임 최소화',
    settings: {
      intensity: 0,
      parallax: 0,
      particles: 0.25,
      glow: 0.5,
      tilt: 0,
      background: 0,
      speed: 2,
      mouseFollow: 0,
      previewAutoplay: false,
    },
  },
}

export const DEFAULT_MOTION_PRESET: MotionPresetId = 'cinematic'
/** 시스템의 '동작 줄이기'를 따를 때 적용하는 프리셋 */
export const REDUCED_MOTION_PRESET: MotionPresetId = 'minimal'

type NumericSettingKey = {
  [K in keyof MotionSettings]: MotionSettings[K] extends number ? K : never
}[keyof MotionSettings]

export interface MotionControl {
  key: NumericSettingKey
  label: string
  hint: string
  min: number
  max: number
  step: number
}

const AMOUNT = { min: 0, max: 1.5, step: 0.05 }

/** Advanced Settings의 슬라이더. 항목을 추가하면 UI에 그대로 나타난다. */
export const motionControls: MotionControl[] = [
  { key: 'intensity', label: 'Motion Intensity', hint: '등장 · 전환 효과의 크기', ...AMOUNT },
  { key: 'parallax', label: 'Parallax Strength', hint: '마우스에 따른 공간의 깊이감', ...AMOUNT },
  { key: 'particles', label: 'Particle Density', hint: '공간을 채우는 입자의 양', ...AMOUNT },
  { key: 'glow', label: 'Glow / Bloom', hint: '빛 번짐의 세기', ...AMOUNT },
  { key: 'tilt', label: 'Card Tilt', hint: '카드가 마우스를 따라 기우는 정도', ...AMOUNT },
  { key: 'background', label: 'Background Motion', hint: '떠 있는 움직임 · 반짝임 · 표류', ...AMOUNT },
  { key: 'speed', label: 'Transition Speed', hint: '화면 전환 속도', min: 0.5, max: 2, step: 0.05 },
  { key: 'mouseFollow', label: 'Mouse Follow', hint: '커서를 따라오는 빛과 버튼 반응', ...AMOUNT },
]

function easeOutQuart(t: number): number {
  return 1 - (1 - t) ** 4
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2
}

export const projectMotion: {
  heroParallax: number
  approach: DurationToken
  approachEase: (t: number) => number
  handoffAt: number
  travel: DurationToken
  travelEase: (t: number) => number
  returnArc: { ratio: number; maxViewport: number }
} = {
  /** 상세 화면을 스크롤할 때 대표 이미지가 따라 움직이는 비율 */
  heroParallax: 0.18,
  /** 작품의 이미지가 공간과 상세 화면 사이를 건너가는 시간과 가감속. 카메라가 물러나고 돌아오는 시간도 같다. */
  /**
   * 작품을 누르면 카메라가 그 작품으로 다가가는 시간과 가감속(바로 출발해 목표 근처에서 길게 감속한다).
   * 돌아올 때도 같은 시간 · 곡선으로 원래 자리로 물러난다.
   */
  approach: 'slow',
  approachEase: easeOutQuart,
  /** 다가가는 시간 중 이 비율이 지나면 작품의 이미지가 상세 화면의 대표 이미지 자리로 넘어가고 화면이 나타난다 */
  handoffAt: 0.7,
  /** 이미지가 공간과 상세 화면 사이를 건너가는 시간과 가감속 */
  travel: 'base',
  travelEase: easeInOutCubic,
  /**
   * 돌아갈 때 그리는 호: 곧게 줄어드는 대신 위로 살짝 떴다가 제자리에 내려앉는다.
   * 높이 = 이동 거리와 줄어드는 폭 중 큰 쪽 × ratio(대표 이미지와 작품이 가까워도 돌아가는 길이 보이게),
   * 화면 높이 × maxViewport를 넘지 않는다.
   */
  returnArc: { ratio: 0.16, maxViewport: 0.07 },
}
