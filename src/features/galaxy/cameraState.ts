import type { Point } from '@/types/ui'

export interface CameraTarget {
  x: number
  y: number
  zoom: number
}

/**
 * 지금 카메라가 보고 있는 world 좌표와 배율.
 * useGalaxyCamera만 쓰고, Starfield처럼 매 프레임 그리는 쪽이 React 렌더 없이 읽는다.
 */
export const cameraState: CameraTarget = { x: 0, y: 0, zoom: 1 }

interface Size {
  width: number
  height: number
}

export function screenToWorld(screen: Point, viewport: Size): Point {
  return {
    x: cameraState.x + (screen.x - viewport.width / 2) / cameraState.zoom,
    y: cameraState.y + (screen.y - viewport.height / 2) / cameraState.zoom,
  }
}
