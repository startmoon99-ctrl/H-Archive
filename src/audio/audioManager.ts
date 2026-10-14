import { SOUND, trackById } from '@/config/sound'
import { clamp } from '@/utils/math'

/** 재생이 따라야 할 상태. soundStore가 바뀔 때마다 넘겨준다 */
export interface SoundTarget {
  enabled: boolean
  trackId: string
  /** 0 ~ 1. 곡의 defaultVolume이 곱해진다 */
  volume: number
}

/**
 * 앱 전체에서 하나뿐인 BGM 재생기. React 밖에 있어 화면 · 상세 전환과 상관없이 끊기지 않는다.
 * 음량과 페이드는 Web Audio의 GainNode로 한다(요소의 volume을 바꿀 수 없는 브라우저에서도 동작한다).
 * 인트로가 끝나 메인 화면이 나타나면 바로 시작한다. 브라우저가 첫 입력 전의 소리를 막으면
 * 기다렸다가 첫 클릭 · 터치 · 키 입력에서 시작한다.
 */
let element: HTMLAudioElement | null = null
let context: AudioContext | null = null
let gain: GainNode | null = null
let target: SoundTarget | null = null
let currentTrackId: string | null = null
let unlocked = false
/** 메인 화면이 나타났다(인트로가 끝났다). 그 전에는 켜져 있어도 시작하지 않는다 */
let stageReady = false
/** 입력 없이 소리를 낼 수 있는지 볼 때 기다리는 시간(ms). 막힌 브라우저는 resume이 끝나지 않고 기다린다 */
const RESUME_WAIT_MS = 300
/** 바뀐 상태가 들어오면 늘어난다. 기다리던 이전 작업은 자기 차례가 지났으면 멈춘다 */
let generation = 0

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

function ensureGraph(): void {
  if (context) return
  element = new Audio()
  element.loop = true
  element.preload = 'auto'
  context = new AudioContext()
  gain = context.createGain()
  gain.gain.value = 0
  context.createMediaElementSource(element).connect(gain).connect(context.destination)
}

/** 지금 음량에서 level까지 ms 동안 바꾼다 */
async function fadeTo(level: number, ms: number): Promise<void> {
  if (!context || !gain) return
  const now = context.currentTime
  gain.gain.cancelScheduledValues(now)
  gain.gain.setValueAtTime(gain.gain.value, now)
  gain.gain.linearRampToValueAtTime(level, now + ms / 1000)
  await sleep(ms)
}

async function apply(): Promise<void> {
  const version = ++generation
  const wanted = target
  if (!wanted) return
  const stale = () => version !== generation

  if (!wanted.enabled) {
    if (element && !element.paused) {
      await fadeTo(0, SOUND.fadeOutMs)
      // 그 사이 다시 켜졌으면 새 작업에 맡긴다
      if (!stale()) element.pause()
    }
    return
  }
  if (!stageReady) return
  ensureGraph()
  if (!element || !context) return
  const running = () => context?.state === 'running'
  if (!running()) {
    await Promise.race([context.resume().catch(() => undefined), sleep(RESUME_WAIT_MS)])
    // 기다리는 사이 꺼졌거나 바뀌었으면 재생을 시작하지 않는다(소리 없이 뒤에서 재생되는 일을 막는다)
    if (stale()) return
    // 브라우저가 아직 소리를 막는다: 첫 입력을 기다린다
    if (!running()) {
      waitForGesture()
      return
    }
  }

  const track = trackById(wanted.trackId)
  const level = clamp(wanted.volume * track.defaultVolume, 0, 1)
  let starting = element.paused

  // 곡이 바뀌었으면 지금 곡을 줄인 뒤 바꾼다
  if (currentTrackId !== track.id) {
    if (!element.paused) {
      await fadeTo(0, SOUND.fadeOutMs)
      if (stale()) return
      element.pause()
    }
    element.src = track.src
    currentTrackId = track.id
    starting = true
  }
  if (element.paused) {
    try {
      await element.play()
    } catch {
      // 아직 소리를 낼 수 없다(브라우저 정책 등): 다음 입력에서 다시 시도한다
      unlocked = false
      waitForGesture()
      return
    }
    if (stale()) {
      // 재생이 시작되는 사이 꺼졌다: 새 작업은 아직 멈춘 줄 알았으므로 여기서 멈춘다
      if (!target?.enabled) element.pause()
      return
    }
  }
  await fadeTo(level, starting ? SOUND.fadeInMs : SOUND.adjustMs)
}

const GESTURES = ['pointerdown', 'keydown', 'touchend'] as const

function onGesture(): void {
  for (const type of GESTURES) window.removeEventListener(type, onGesture, true)
  unlocked = true
  // AudioContext는 입력 처리 중에 만들어야 소리를 낼 수 있다
  ensureGraph()
  void context?.resume()
  void apply()
}

function waitForGesture(): void {
  for (const type of GESTURES) window.addEventListener(type, onGesture, { capture: true, passive: true })
}

/** 메인 화면이 나타날 때 부른다. 켜져 있으면 바로 시작한다 */
export function allowSoundStart(): void {
  if (stageReady) return
  stageReady = true
  void apply()
}

/** 설정이 바뀔 때마다 부른다. 첫 입력 전이면 기억해 두었다가 입력이 오면 그대로 시작한다 */
export function syncSound(next: SoundTarget): void {
  target = next
  if (!unlocked) waitForGesture()
  void apply()
}
