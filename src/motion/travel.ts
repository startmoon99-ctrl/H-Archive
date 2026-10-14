import type { TravelOrigin } from '@/store/uiStore'
import type { ID } from '@/types/archive'

/**
 * 작품 ↔ 상세 화면 전환의 접점.
 * 공간(features/space)은 "그 작품이 지금 화면의 어디에 있는가"를 알려 주고,
 * 상세 화면(features/project)은 닫힐 때 그 자리로 이미지를 돌려보낸다. 서로를 직접 알지 않는다.
 * 열 때의 출발 자리는 uiStore.travelOrigin으로 건넨다.
 */
type Locate = (projectId: ID) => TravelOrigin | null

let locate: Locate | null = null

/** 공간이 등록한다. 돌려주는 함수로 해제한다. */
export function provideWorkLocation(next: Locate): () => void {
  locate = next
  return () => {
    if (locate === next) locate = null
  }
}

/** 그 작품의 프레임이 지금 놓인 화면 자리. 공간에 보이지 않으면 null */
export function locateWork(projectId: ID): TravelOrigin | null {
  return locate?.(projectId) ?? null
}
