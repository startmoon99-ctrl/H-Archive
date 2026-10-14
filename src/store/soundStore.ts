import { create } from 'zustand'
import { allowSoundStart, syncSound } from '@/audio/audioManager'
import { STORAGE_KEYS } from '@/config/app'
import { SOUND, trackById } from '@/config/sound'
import { clamp } from '@/utils/math'
import { useUiStore } from './uiStore'

export interface SoundSettings {
  enabled: boolean
  trackId: string
  /** 0 ~ 1 */
  volume: number
}

interface SoundState extends SoundSettings {
  setEnabled: (enabled: boolean) => void
  setTrack: (trackId: string) => void
  setVolume: (volume: number) => void
}

/** 저장된 값을 읽는다. 없어진 곡이나 범위를 벗어난 값은 기본값으로 바로잡는다 */
export function loadSoundSettings(raw: string | null): SoundSettings {
  const fallback: SoundSettings = { enabled: SOUND.defaultEnabled, trackId: trackById('').id, volume: SOUND.defaultVolume }
  if (!raw) return fallback
  try {
    const saved = JSON.parse(raw) as Partial<SoundSettings> & { version?: number }
    // 기본 음량이 바뀌기 전에 저장된 음량은 새 기본값으로 맞춘다(켜짐 · 곡은 그대로)
    const current = saved.version === SOUND.settingsVersion
    return {
      enabled: typeof saved.enabled === 'boolean' ? saved.enabled : fallback.enabled,
      trackId: trackById(typeof saved.trackId === 'string' ? saved.trackId : '').id,
      volume:
        current && typeof saved.volume === 'number' && Number.isFinite(saved.volume)
          ? clamp(saved.volume, 0, 1)
          : fallback.volume,
    }
  } catch {
    return fallback
  }
}

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.sound)
  } catch {
    return null
  }
}

export const useSoundStore = create<SoundState>((set) => ({
  ...loadSoundSettings(readStored()),
  setEnabled: (enabled) => set({ enabled }),
  setTrack: (trackId) => set({ trackId: trackById(trackId).id }),
  setVolume: (volume) => set({ volume: clamp(volume, 0, 1) }),
}))

/** store와 재생기 · localStorage를 잇는다. 앱 시작 때 한 번 호출한다. */
export function initSound(): void {
  const sync = ({ enabled, trackId, volume }: SoundState) => {
    syncSound({ enabled, trackId, volume })
    try {
      localStorage.setItem(STORAGE_KEYS.sound, JSON.stringify({ enabled, trackId, volume, version: SOUND.settingsVersion }))
    } catch {
      // 저장하지 못해도 이번 실행에서는 그대로 쓴다
    }
  }
  sync(useSoundStore.getState())
  useSoundStore.subscribe(sync)

  // 인트로가 끝나 메인 화면이 나타나기 시작하면 음악을 시작한다
  const reveal = () => {
    if (useUiStore.getState().introPhase === 'playing') return
    allowSoundStart()
    unsubscribe()
  }
  const unsubscribe = useUiStore.subscribe(reveal)
  reveal()
}
