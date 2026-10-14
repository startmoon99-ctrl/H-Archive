import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/motion/runtime', () => ({ applyMotion: vi.fn() }))

beforeEach(() => {
  vi.resetModules()
  vi.stubGlobal('window', { matchMedia: () => ({ matches: false, addEventListener: vi.fn() }) })
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

describe('motion 설정 저장 실패', () => {
  it('getItem/setItem이 모두 실패해도 기본 설정을 적용하고 초기화를 계속한다', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('SecurityError') },
      setItem: () => { throw new Error('QuotaExceededError') },
    })
    const { initMotion, useMotionStore } = await import('./motionStore')
    const { DEFAULT_MOTION_PRESET, motionPresets } = await import('@/config/motion')
    const { applyMotion } = await import('@/motion/runtime')
    const continueStartup = vi.fn()
    expect(() => { initMotion(); continueStartup() }).not.toThrow()
    expect(continueStartup).toHaveBeenCalledOnce()
    expect(useMotionStore.getState().settings).toEqual(motionPresets[DEFAULT_MOTION_PRESET].settings)
    expect(applyMotion).toHaveBeenCalled()
  })

  it('영속화 실패 후에도 설정 변경은 메모리와 화면에 반영된다', async () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null, setItem: () => { throw new Error('full') },
    })
    const { initMotion, useMotionStore } = await import('./motionStore')
    const { applyMotion } = await import('@/motion/runtime')
    initMotion()
    expect(() => useMotionStore.getState().setSetting('speed', 1.5)).not.toThrow()
    expect(useMotionStore.getState().settings.speed).toBe(1.5)
    expect(applyMotion).toHaveBeenLastCalledWith(expect.objectContaining({ speed: 1.5 }))
  })
})

describe('저장된 motion 설정 읽기', () => {
  const load = async (saved: unknown) => {
    vi.stubGlobal('localStorage', { getItem: () => JSON.stringify(saved), setItem: vi.fn() })
    const { useMotionStore } = await import('./motionStore')
    const { DEFAULT_MOTION_PRESET, MOTION_SETTINGS_VERSION, motionPresets } = await import('@/config/motion')
    return { state: useMotionStore.getState(), DEFAULT_MOTION_PRESET, MOTION_SETTINGS_VERSION, motionPresets }
  }

  it('프리셋 구성이 바뀌기 전에 저장된 선택은 기본 프리셋(CINEMATIC)으로', async () => {
    const { state, motionPresets } = await load({ presetId: 'calm', settings: { speed: 0.85 }, followSystem: false })
    expect(state.presetId).toBe('cinematic')
    expect(state.settings).toEqual(motionPresets.cinematic.settings)
    expect(state.followSystem).toBe(false)
  })

  it('고른 프리셋은 프리셋의 지금 값을 쓴다', async () => {
    const { state, motionPresets } = await load({ presetId: 'swift', settings: { speed: 0.1 }, followSystem: true, version: 2 })
    expect(state.presetId).toBe('swift')
    expect(state.settings).toEqual(motionPresets.swift.settings)
  })

  it('직접 조절한 값은 유지하고, 없는 Feel은 기본으로', async () => {
    const { state } = await load({ presetId: 'custom', settings: { speed: 1.3, feel: 'removed' }, followSystem: true, version: 2 })
    expect(state.presetId).toBe('custom')
    expect(state.settings.speed).toBe(1.3)
    expect(state.settings.feel).toBe('smooth')
    expect(state.settings.weight).toBe(1.6)
  })
})
