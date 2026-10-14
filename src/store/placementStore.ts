import { create } from 'zustand'
import { STORAGE_KEYS } from '@/config/app'
import type { ID } from '@/types/archive'

/**
 * 직접 옮긴 성단의 자리. 기록(IndexedDB)이 아니라 보는 방식의 설정이므로 이 브라우저(localStorage)에만 저장한다.
 * 옮기지 않은 성단은 여기에 없고, 예전처럼 만든 순서로 계산한 자리에 놓인다(scene/layout).
 * 화면 방향과 상관없이 같은 자리가 되도록 가로 화면 기준(along = 가로 화면의 x, across = y)으로 적는다.
 */
export interface Placement {
  along: number
  across: number
  z: number
}

export type Placements = Record<ID, Placement>

interface PlacementState {
  placements: Placements
  /** 한 성단의 자리를 정한다 */
  place: (id: ID, placement: Placement) => void
  /** 통째로 바꾼다(편집 취소 때 처음 상태로 되돌리기) */
  setPlacements: (placements: Placements) => void
  /** 모두 자동 배치로 되돌린다 */
  clearPlacements: () => void
}

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

/** 저장된 값을 읽는다. 깨졌거나 숫자가 아닌 항목은 버린다 */
export function loadPlacements(raw: string | null): Placements {
  if (!raw) return {}
  try {
    const saved = JSON.parse(raw) as unknown
    if (!saved || typeof saved !== 'object') return {}
    const placements: Placements = {}
    for (const [id, value] of Object.entries(saved as Record<string, Partial<Placement>>)) {
      if (value && finite(value.along) && finite(value.across) && finite(value.z)) {
        placements[id] = { along: value.along, across: value.across, z: value.z }
      }
    }
    return placements
  } catch {
    return {}
  }
}

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.placements)
  } catch {
    return null
  }
}

function persist(placements: Placements): void {
  try {
    if (Object.keys(placements).length === 0) localStorage.removeItem(STORAGE_KEYS.placements)
    else localStorage.setItem(STORAGE_KEYS.placements, JSON.stringify(placements))
  } catch {
    // 저장하지 못해도 이번 실행에서는 그대로 쓴다
  }
}

export const usePlacementStore = create<PlacementState>((set, get) => ({
  placements: loadPlacements(readStored()),
  place: (id, placement) => {
    const placements = { ...get().placements, [id]: placement }
    persist(placements)
    set({ placements })
  },
  setPlacements: (placements) => {
    persist(placements)
    set({ placements })
  },
  clearPlacements: () => {
    persist({})
    set({ placements: {} })
  },
}))
