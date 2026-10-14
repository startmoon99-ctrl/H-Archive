import type { TravelOrigin } from '@/store/uiStore'
import type { ID } from '@/types/archive'

/**
 * 작품 ↔ 상세 화면 전환의 접점.
 * 공간(features/space)은 "그 작품이 지금 화면의 어디에 있는가"를 알려 주고,
 * 상세 화면(features/project)은 닫힐 때 그 자리로 이미지를 돌려보낸다. 서로를 직접 알지 않는다.
 * 열 때의 출발 자리는 uiStore.travelOrigin으로 건넨다.
 */
type Locate = (projectId: ID) => TravelOrigin | null

interface WorkLocator {
  /** 장면이 마지막 프레임에 계산한 자리(DOM을 재지 않는다). 매 프레임 따라갈 때 쓴다 */
  locate: Locate
  /** 지금 보이는 그대로의 자리(Hover로 커진 것까지). 한 번만 재서 이어받을 때 쓴다 */
  measure: Locate
}

let locator: WorkLocator | null = null

/** 공간이 등록한다. 돌려주는 함수로 해제한다. */
export function provideWorkLocation(next: WorkLocator): () => void {
  locator = next
  return () => {
    if (locator === next) locator = null
  }
}

/** 그 작품의 프레임이 지금 놓인 화면 자리. 공간에 보이지 않으면 null */
export function locateWork(projectId: ID): TravelOrigin | null {
  return locator?.locate(projectId) ?? null
}

/** 그 작품의 프레임이 지금 보이는 그대로의 자리. 화면에 없으면 null */
export function measureWork(projectId: ID): TravelOrigin | null {
  return locator?.measure(projectId) ?? null
}
