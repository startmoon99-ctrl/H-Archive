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
  /** 카메라의 무게. 클수록 입력을 늦게 따라오고 놓은 뒤 오래 미끄러진다 */
  weight: number
  /** 움직임의 가감속 성격(motionFeels) */
  feel: MotionFeelId
  previewAutoplay: boolean
}

export type MotionFeelId = 'smooth' | 'float' | 'snappy' | 'elastic'

export interface MotionFeel {
  id: MotionFeelId
  label: string
  /** motionTokens.easing에서 바꿀 곡선. 화면의 모든 전환 · 등장 · 반응이 이 곡선을 쓴다 */
  easing: Partial<Record<keyof typeof motionTokens.easing, string>>
}

export const motionFeels: Record<MotionFeelId, MotionFeel> = {
  /** 기준: motionTokens.easing 그대로 */
  smooth: { id: 'smooth', label: 'Smooth', easing: {} },
  /** 천천히 떠올라 길게 가라앉는다. 튕김 없음 */
  float: {
    id: 'float',
    label: 'Float',
    easing: {
      standard: 'cubic-bezier(0.45, 0, 0.25, 1)',
      enter: 'cubic-bezier(0.33, 0, 0.1, 1)',
      exit: 'cubic-bezier(0.55, 0, 0.75, 0.3)',
      cinematic: 'cubic-bezier(0.76, 0, 0.24, 1)',
      spring: 'cubic-bezier(0.37, 0, 0.2, 1)',
    },
  },
  /** 바로 튀어 나가 짧게 멈춘다 */
  snappy: {
    id: 'snappy',
    label: 'Snappy',
    easing: {
      standard: 'cubic-bezier(0.3, 0, 0, 1)',
      enter: 'cubic-bezier(0.05, 0.75, 0.1, 1)',
      exit: 'cubic-bezier(0.4, 0, 1, 0.6)',
      cinematic: 'cubic-bezier(0.2, 0.6, 0.1, 1)',
      spring: 'cubic-bezier(0.2, 1.4, 0.4, 1)',
    },
  },
  /** 목표를 지나쳤다가 탄성 있게 돌아온다 */
  elastic: {
    id: 'elastic',
    label: 'Elastic',
    easing: {
      standard: 'cubic-bezier(0.3, 1.25, 0.5, 1)',
      enter: 'cubic-bezier(0.34, 1.5, 0.5, 1)',
      cinematic: 'cubic-bezier(0.6, -0.15, 0.25, 1.2)',
      spring: 'cubic-bezier(0.3, 2, 0.5, 1)',
    },
  },
}

export type MotionPresetId = 'cinematic' | 'immersive' | 'calm' | 'drift' | 'swift' | 'elastic' | 'minimal'

export interface MotionPreset {
  id: MotionPresetId
  label: string
  description: string
  settings: MotionSettings
}

/** 프리셋끼리 느낌이 확실히 갈리도록 속도 · 무게 · 가감속 성격을 크게 벌려 둔다. 화면에는 이 순서로 놓인다. */
export const motionPresets: Record<MotionPresetId, MotionPreset> = {
  cinematic: {
    id: 'cinematic',
    label: 'CINEMATIC',
    description: '깊은 시차, 느리고 무게감 있는 카메라와 전환',
    settings: {
      intensity: 1.2,
      parallax: 1.2,
      particles: 1,
      glow: 1.1,
      tilt: 0.8,
      background: 0.7,
      speed: 0.7,
      mouseFollow: 0.8,
      weight: 1.6,
      feel: 'smooth',
      previewAutoplay: true,
    },
  },
  immersive: {
    id: 'immersive',
    label: 'IMMERSIVE',
    description: '많은 입자, 강한 마우스 반응과 빛, 살아 움직이는 공간',
    settings: {
      intensity: 1.3,
      parallax: 1.5,
      particles: 1.5,
      glow: 1.4,
      tilt: 1.3,
      background: 1.3,
      speed: 1,
      mouseFollow: 1.5,
      weight: 1,
      feel: 'smooth',
      previewAutoplay: true,
    },
  },
  drift: {
    id: 'drift',
    label: 'DRIFT',
    description: '꿈결처럼 떠다니는 공간, 짙은 빛 번짐, 오래 미끄러지는 카메라',
    settings: {
      intensity: 1,
      parallax: 1,
      particles: 1.2,
      glow: 1.5,
      tilt: 0.6,
      background: 1.5,
      speed: 0.55,
      mouseFollow: 1,
      weight: 2.4,
      feel: 'float',
      previewAutoplay: true,
    },
  },
  swift: {
    id: 'swift',
    label: 'SWIFT',
    description: '빠르고 또렷한 반응, 가벼운 카메라, 짧은 전환',
    settings: {
      intensity: 0.8,
      parallax: 0.8,
      particles: 0.8,
      glow: 0.8,
      tilt: 0.6,
      background: 0.9,
      speed: 1.7,
      mouseFollow: 1.1,
      weight: 0.45,
      feel: 'snappy',
      previewAutoplay: true,
    },
  },
  elastic: {
    id: 'elastic',
    label: 'ELASTIC',
    description: '튕기듯 살아 있는 반응, 크게 기우는 카드, 탄성 있는 등장',
    settings: {
      intensity: 1.5,
      parallax: 1.2,
      particles: 1,
      glow: 1.1,
      tilt: 1.5,
      background: 1,
      speed: 1.1,
      mouseFollow: 1.5,
      weight: 0.8,
      feel: 'elastic',
      previewAutoplay: true,
    },
  },
  calm: {
    id: 'calm',
    label: 'CALM',
    description: '느린 움직임, 적은 입자, 약한 시차',
    settings: {
      intensity: 0.5,
      parallax: 0.35,
      particles: 0.45,
      glow: 0.6,
      tilt: 0.3,
      background: 0.35,
      speed: 0.8,
      mouseFollow: 0.35,
      weight: 1.3,
      feel: 'float',
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
      weight: 1,
      feel: 'smooth',
      previewAutoplay: false,
    },
  },
}

export const DEFAULT_MOTION_PRESET: MotionPresetId = 'cinematic'
/** 저장 형식의 버전. 프리셋 구성을 크게 바꿔 저장된 선택을 한 번 기본 프리셋으로 되돌릴 때 올린다 */
export const MOTION_SETTINGS_VERSION = 2
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
  { key: 'weight', label: 'Camera Weight', hint: '카메라가 따라오는 무게와 놓은 뒤 미끄러지는 길이', min: 0.4, max: 2.5, step: 0.05 },
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
