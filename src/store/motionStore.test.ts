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
