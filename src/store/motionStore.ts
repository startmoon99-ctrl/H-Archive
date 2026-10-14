import { create } from 'zustand'
import { STORAGE_KEYS } from '@/config/app'
import {
  DEFAULT_MOTION_PRESET,
  MOTION_SETTINGS_VERSION,
  REDUCED_MOTION_PRESET,
  motionFeels,
  motionPresets,
  type MotionPresetId,
  type MotionSettings,
} from '@/config/motion'
import { applyMotion } from '@/motion/runtime'

interface MotionState {
  /** 슬라이더를 직접 만지면 custom이 된다 */
  presetId: MotionPresetId | 'custom'
  settings: MotionSettings
  /** 시스템의 '동작 줄이기' 설정을 따를 것인가 */
  followSystem: boolean
  systemReduced: boolean

  setPreset: (id: MotionPresetId) => void
  setSetting: <K extends keyof MotionSettings>(key: K, value: MotionSettings[K]) => void
  setFollowSystem: (follow: boolean) => void
}

type Persisted = Pick<MotionState, 'presetId' | 'settings' | 'followSystem'>

const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

function loadPersisted(): Persisted {
  const fallback: Persisted = {
    presetId: DEFAULT_MOTION_PRESET,
    settings: motionPresets[DEFAULT_MOTION_PRESET].settings,
    followSystem: true,
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.motion)
    if (!raw) return fallback
    const saved = JSON.parse(raw) as Partial<Persisted> & { version?: number }
    const followSystem = saved.followSystem ?? true
    // 프리셋 구성이 바뀌기 전에 저장된 선택은 기본 프리셋으로 되돌린다
    if (saved.version !== MOTION_SETTINGS_VERSION) return { ...fallback, followSystem }
    // 프리셋을 고른 상태면 프리셋의 지금 값을 쓴다(프리셋을 다듬으면 그대로 따라온다)
    if (saved.presetId && saved.presetId !== 'custom' && saved.presetId in motionPresets) {
      return { presetId: saved.presetId, settings: motionPresets[saved.presetId].settings, followSystem }
    }
    // 직접 조절한 값: 나중에 추가된 항목이 비지 않도록 기본값 위에 덮는다
    const settings = { ...fallback.settings, ...saved.settings }
    if (!(settings.feel in motionFeels)) settings.feel = fallback.settings.feel
    return { presetId: 'custom', settings, followSystem }
  } catch (error) {
    if (import.meta.env.DEV) console.warn('[motion] 저장된 설정을 읽지 못해 기본 설정을 사용합니다.', error)
    return fallback
  }
}

/** 실제로 적용할 설정. 시스템이 동작 줄이기를 요청하면 최소 프리셋으로 바꾼다. */
export function selectActiveMotion(state: MotionState): MotionSettings {
  return state.systemReduced && state.followSystem ? motionPresets[REDUCED_MOTION_PRESET].settings : state.settings
}

export const useMotionStore = create<MotionState>((set) => ({
  ...loadPersisted(),
  systemReduced: reducedQuery.matches,

  setPreset: (id) => set({ presetId: id, settings: motionPresets[id].settings }),
  setSetting: (key, value) =>
    set((state) => ({ presetId: 'custom', settings: { ...state.settings, [key]: value } })),
  setFollowSystem: (followSystem) => set({ followSystem }),
}))

/** store와 모션 런타임 · localStorage를 잇는다. 앱 시작 때 한 번 호출한다. */
export function initMotion(): void {
  const sync = (state: MotionState) => {
    applyMotion(selectActiveMotion(state))
    const persisted: Persisted & { version: number } = {
      presetId: state.presetId,
      settings: state.settings,
      followSystem: state.followSystem,
      version: MOTION_SETTINGS_VERSION,
    }
    try {
      localStorage.setItem(STORAGE_KEYS.motion, JSON.stringify(persisted))
    } catch (error) {
      // 설정은 이미 메모리와 화면에 적용됐다. 영속화 실패가 앱 시작/설정 변경을 막지 않는다.
      if (import.meta.env.DEV) console.warn('[motion] 설정을 메모리에서만 유지합니다.', error)
    }
  }
  sync(useMotionStore.getState())
  useMotionStore.subscribe(sync)
  reducedQuery.addEventListener('change', (event) => useMotionStore.setState({ systemReduced: event.matches }))
}
