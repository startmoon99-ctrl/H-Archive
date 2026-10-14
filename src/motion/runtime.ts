import {
  DEFAULT_MOTION_PRESET,
  motionPresets,
  motionTokens,
  type DurationToken,
  type MotionSettings,
} from '@/config/motion'

/**
 * 지금 적용 중인 모션 설정. CSS(변수)와 JS(rAF 루프 · 타이머)가 같은 값을 쓰게 하는 접점이다.
 * 값은 motionStore가 applyMotion으로만 바꾼다.
 */
let active: MotionSettings = motionPresets[DEFAULT_MOTION_PRESET].settings

/** rAF 루프처럼 React 밖에서 설정을 읽을 때 쓴다. */
export function getMotion(): MotionSettings {
  return active
}

/** Transition Speed가 반영된 실제 시간(ms) */
export function motionMs(token: DurationToken): number {
  return motionTokens.duration[token] / active.speed
}

export function applyMotion(settings: MotionSettings): void {
  active = settings
  const root = document.documentElement
  const set = (name: string, value: string | number) => root.style.setProperty(name, String(value))

  for (const [name, ms] of Object.entries(motionTokens.duration)) {
    set(`--dur-${name}`, `${Math.round(ms / settings.speed)}ms`)
  }
  for (const [name, curve] of Object.entries(motionTokens.easing)) {
    set(`--ease-${name}`, curve)
  }
  set('--stagger', `${Math.round(motionTokens.stagger / settings.speed)}ms`)
  set('--reveal-distance', `${motionTokens.reveal.distance * settings.intensity}px`)
  set('--reveal-blur', `${motionTokens.reveal.blur * settings.intensity}px`)
  set('--reveal-scale', 1 - motionTokens.reveal.scale * settings.intensity)

  set('--m-intensity', settings.intensity)
  set('--m-glow', settings.glow)
  set('--m-ambient-rate', Math.max(settings.background, motionTokens.minAmbientRate))
  set('--ambient-play', settings.background > 0 ? 'running' : 'paused')

  root.dataset.motion = settings.intensity === 0 ? 'minimal' : 'full'
}
