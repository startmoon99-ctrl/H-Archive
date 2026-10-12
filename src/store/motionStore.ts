import { create } from 'zustand'
import { STORAGE_KEYS } from '@/config/app'
import {
  DEFAULT_MOTION_PRESET,
  REDUCED_MOTION_PRESET,
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
    const saved = JSON.parse(raw) as Partial<Persisted>
    return {
      presetId: saved.presetId ?? fallback.presetId,
      // 나중에 추가된 설정 항목이 비지 않도록 기본값 위에 덮는다
      settings: { ...fallback.settings, ...saved.settings },
      followSystem: saved.followSystem ?? true,
    }
  } catch {
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
    const persisted: Persisted = {
      presetId: state.presetId,
      settings: state.settings,
      followSystem: state.followSystem,
    }
    localStorage.setItem(STORAGE_KEYS.motion, JSON.stringify(persisted))
  }
  sync(useMotionStore.getState())
  useMotionStore.subscribe(sync)
  reducedQuery.addEventListener('change', (event) => useMotionStore.setState({ systemReduced: event.matches }))
}
