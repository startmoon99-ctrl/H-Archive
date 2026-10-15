import { create } from 'zustand'
import { STORAGE_KEYS } from '@/config/app'
import { spaceConfig } from '@/config/space'

/**
 * 공간의 분위기 설정(설정 → Space): 별의 생동감 단계 · 별똥별 · 가만히 있을 때 카메라가 둘러보는 단계.
 * 보는 방식의 설정이라 기록(IndexedDB)이 아니라 이 브라우저(localStorage)에만 저장한다.
 * 모션 프리셋과는 따로 움직인다. 움직임의 크기에는 Background Motion이 함께 곱해진다(동작 줄이기에서는 멈춘다).
 */
export interface SkySettings {
  /** config/space.ts의 particles.stars.levels 번호. 0이 기본 */
  level: number
  meteors: boolean
  /** config/space.ts의 camera.idleOrbit.levels 번호. 0이 멈춤 */
  orbit: number
}

interface SkyState extends SkySettings {
  setLevel: (level: number) => void
  setMeteors: (meteors: boolean) => void
  setOrbit: (orbit: number) => void
}

const STAR_LEVELS = spaceConfig.particles.stars.levels.length
const ORBIT_LEVELS = spaceConfig.camera.idleOrbit.levels.length
const DEFAULTS: SkySettings = { level: 0, meteors: true, orbit: spaceConfig.camera.idleOrbit.defaultLevel }
/**
 * 저장 형식의 버전. 기본값이 바뀌어 저장된 별똥별 켜짐을 한 번 새 기본값으로 맞출 때 올린다(단계는 그대로).
 * 2: 별똥별이 기본으로 켜졌다
 */
export const SKY_SETTINGS_VERSION = 2

/** 단계 번호로 바로잡는다: 숫자가 아니면 fallback, 소수는 반올림, 범위 밖은 가까운 끝 */
function toStep(value: unknown, count: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.min(Math.max(Math.round(value), 0), count - 1)
    : fallback
}

/** 저장된 값을 읽는다. 범위를 벗어나거나 깨진 값은 기본값으로 바로잡는다 */
export function loadSkySettings(raw: string | null): SkySettings {
  if (!raw) return DEFAULTS
  try {
    const saved = JSON.parse(raw) as (Partial<SkySettings> & { version?: number }) | null
    const current = saved?.version === SKY_SETTINGS_VERSION
    return {
      level: toStep(saved?.level, STAR_LEVELS, DEFAULTS.level),
      meteors: current && typeof saved?.meteors === 'boolean' ? saved.meteors : DEFAULTS.meteors,
      orbit: toStep(saved?.orbit, ORBIT_LEVELS, DEFAULTS.orbit),
    }
  } catch {
    return DEFAULTS
  }
}

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.sky)
  } catch {
    return null
  }
}

export const useSkyStore = create<SkyState>((set) => ({
  ...loadSkySettings(readStored()),
  setLevel: (level) => set({ level: toStep(level, STAR_LEVELS, DEFAULTS.level) }),
  setMeteors: (meteors) => set({ meteors }),
  setOrbit: (orbit) => set({ orbit: toStep(orbit, ORBIT_LEVELS, DEFAULTS.orbit) }),
}))

/** store와 localStorage를 잇는다. 앱 시작 때 한 번 호출한다. */
export function initSky(): void {
  useSkyStore.subscribe(({ level, meteors, orbit }) => {
    try {
      localStorage.setItem(STORAGE_KEYS.sky, JSON.stringify({ level, meteors, orbit, version: SKY_SETTINGS_VERSION }))
    } catch {
      // 저장하지 못해도 이번 실행에서는 그대로 쓴다
    }
  })
}
