import { spaceConfig } from '@/config/space'
import type { Point } from '@/types/ui'

/** 카메라가 바라보는 지점(초점)과 배율. 초점면에 있는 것은 화면에서 zoom배로 보인다. */
export interface CameraGoal {
  x: number
  y: number
  z: number
  zoom: number
}

export interface Bounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

interface CameraView extends CameraGoal {
  /** 마우스 시차와 느린 표류로 카메라가 옆으로 밀린 거리(world) */
  offsetX: number
  offsetY: number
  /** 초점 거리(px) */
  focal: number
  width: number
  height: number
}

/**
 * 지금 화면에 적용된 카메라. cameraRig만 쓰고, 장면 · 환경 · 조작이 매 프레임 읽는다.
 * 카메라는 초점에서 focal / zoom 만큼 뒤에서 -z 방향을 바라본다.
 */
export const cameraView: CameraView = {
  x: 0,
  y: 0,
  z: 0,
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  focal: 800,
  width: 1,
  height: 1,
}

/** 카메라에서 초점면까지의 거리 */
export function focusDistance(): number {
  return cameraView.focal / cameraView.zoom
}

export interface Projected {
  /** 화면 px */
  x: number
  y: number
  /** world 1단위가 화면에서 몇 px인가 */
  scale: number
  /** 카메라로부터의 거리 */
  depth: number
}

/** world 좌표 → 화면. 카메라 뒤이거나 너무 가까우면 false. 결과는 out에 쓴다(프레임마다 객체를 만들지 않기 위해). */
export function project(x: number, y: number, z: number, out: Projected): boolean {
  const depth = cameraView.z + focusDistance() - z
  if (depth <= spaceConfig.camera.near) return false
  const scale = cameraView.focal / depth
  out.x = cameraView.width / 2 + (x - cameraView.x - cameraView.offsetX) * scale
  out.y = cameraView.height / 2 + (y - cameraView.y - cameraView.offsetY) * scale
  out.scale = scale
  out.depth = depth
  return true
}

/** 화면의 한 점이 초점면에서 가리키는 world 좌표 */
export function screenToFocusPlane(screen: Point): Point {
  return {
    x: cameraView.x + cameraView.offsetX + (screen.x - cameraView.width / 2) / cameraView.zoom,
    y: cameraView.y + cameraView.offsetY + (screen.y - cameraView.height / 2) / cameraView.zoom,
  }
}
