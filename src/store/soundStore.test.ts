import { describe, expect, it } from 'vitest'
import { BGM_TRACKS, SOUND } from '@/config/sound'
import { loadSoundSettings } from './soundStore'

describe('loadSoundSettings', () => {
  it('저장된 값이 없으면 기본값', () => {
    expect(loadSoundSettings(null)).toEqual({ enabled: SOUND.defaultEnabled, trackId: BGM_TRACKS[0].id, volume: SOUND.defaultVolume })
  })

  it('저장된 값을 그대로 쓴다', () => {
    const saved = { enabled: false, trackId: BGM_TRACKS[0].id, volume: 0.3 }
    expect(loadSoundSettings(JSON.stringify({ ...saved, version: SOUND.settingsVersion }))).toEqual(saved)
  })

  it('기본 음량이 바뀌기 전에 저장된 음량은 새 기본값으로(켜짐 · 곡은 유지)', () => {
    const loaded = loadSoundSettings(JSON.stringify({ enabled: false, trackId: BGM_TRACKS[0].id, volume: 0.7 }))
    expect(loaded).toEqual({ enabled: false, trackId: BGM_TRACKS[0].id, volume: SOUND.defaultVolume })
  })

  it('없어진 곡은 첫 곡으로, 범위를 벗어난 음량은 0 ~ 1로', () => {
    const loaded = loadSoundSettings(JSON.stringify({ enabled: true, trackId: 'removed', volume: 4, version: SOUND.settingsVersion }))
    expect(loaded.trackId).toBe(BGM_TRACKS[0].id)
    expect(loaded.volume).toBe(1)
  })

  it('깨진 값이면 기본값', () => {
    expect(loadSoundSettings('{not json')).toEqual(loadSoundSettings(null))
  })
})
