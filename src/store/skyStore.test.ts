import { describe, expect, it } from 'vitest'
import { spaceConfig } from '@/config/space'
import { SKY_SETTINGS_VERSION, loadSkySettings } from './skyStore'

const saved = (value: object) => JSON.stringify({ ...value, version: SKY_SETTINGS_VERSION })
const ORBIT_DEFAULT = spaceConfig.camera.idleOrbit.defaultLevel

describe('loadSkySettings', () => {
  it('저장된 값이 없으면 기본 단계 · 별똥별 켜짐 · 카메라 기본 단계', () => {
    expect(loadSkySettings(null)).toEqual({ level: 0, meteors: true, orbit: ORBIT_DEFAULT })
  })

  it('저장된 값을 그대로 쓴다', () => {
    expect(loadSkySettings(saved({ level: 2, meteors: false, orbit: 1 }))).toEqual({ level: 2, meteors: false, orbit: 1 })
  })

  it('카메라 단계가 없던 저장 값은 카메라만 기본 단계로', () => {
    expect(loadSkySettings(saved({ level: 2, meteors: false }))).toEqual({ level: 2, meteors: false, orbit: ORBIT_DEFAULT })
  })

  it('기본값이 바뀌기 전에 저장된 별똥별 꺼짐은 새 기본값으로(단계는 유지)', () => {
    expect(loadSkySettings(JSON.stringify({ level: 3, meteors: false }))).toEqual({ level: 3, meteors: true, orbit: ORBIT_DEFAULT })
  })

  it('없는 단계는 가까운 단계로, 소수는 반올림', () => {
    const last = spaceConfig.particles.stars.levels.length - 1
    expect(loadSkySettings(saved({ level: 99 })).level).toBe(last)
    expect(loadSkySettings(saved({ level: -3 })).level).toBe(0)
    expect(loadSkySettings(saved({ level: 1.4 })).level).toBe(1)
    expect(loadSkySettings(saved({ orbit: 99 })).orbit).toBe(spaceConfig.camera.idleOrbit.levels.length - 1)
    expect(loadSkySettings(saved({ orbit: -1 })).orbit).toBe(0)
  })

  it('깨진 값이면 기본값', () => {
    expect(loadSkySettings('{not json')).toEqual(loadSkySettings(null))
    expect(loadSkySettings(saved({ level: 'a', meteors: 1, orbit: 'x' }))).toEqual(loadSkySettings(null))
  })
})
