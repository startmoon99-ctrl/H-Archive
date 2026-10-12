/**
 * 모션의 단일 출처.
 * - motionTokens: 시간 · easing · 거리 같은 기준값
 * - motionPresets / motionControls: Motion Settings가 그대로 그리는 프리셋과 조절 항목
 * - galaxyMotion / projectMotion: 기능별 모션 수치
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
  { key: 'particles', label: 'Particle Density', hint: '별과 먼지의 양', ...AMOUNT },
  { key: 'glow', label: 'Glow / Bloom', hint: '빛 번짐의 세기', ...AMOUNT },
  { key: 'tilt', label: 'Card Tilt', hint: '카드가 마우스를 따라 기우는 정도', ...AMOUNT },
  { key: 'background', label: 'Background Motion', hint: '공전 · 반짝임 · 표류 속도', ...AMOUNT },
  { key: 'speed', label: 'Transition Speed', hint: '화면 전환 속도', min: 0.5, max: 2, step: 0.05 },
  { key: 'mouseFollow', label: 'Mouse Follow', hint: '커서를 따라오는 빛과 버튼 반응', ...AMOUNT },
]

function easeInOutQuint(t: number): number {
  return t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2
}

export const galaxyMotion = {
  camera: {
    /** 항성계로 이동할 때의 가감속 곡선 */
    travelEase: easeInOutQuint,
    /** 드래그를 놓은 뒤 프레임(16ms)마다 남는 속도 비율 */
    inertiaFriction: 0.93,
    minInertia: 0.01,
  },
  parallax: {
    /** 마우스가 화면 끝에 있을 때 은하가 밀리는 거리(px) */
    worldShift: 20,
    /** 마우스에 따른 은하 평면의 최대 기울기(deg) */
    tiltDeg: 3.2,
    smoothing: 0.06,
    perspective: 1400,
  },
  /** 평상시 움직임이 0이어도 0으로 나누지 않도록 하는 하한 */
  minAmbientRate: 0.05,
} as const

export const projectMotion = {
  /** 상세 화면을 스크롤할 때 대표 이미지가 따라 움직이는 비율 */
  heroParallax: 0.18,
} as const
