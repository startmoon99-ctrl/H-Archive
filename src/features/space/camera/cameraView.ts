import { spaceConfig } from '@/config/space'
import type { Point } from '@/types/ui'

/**
 * 카메라가 바라보는 지점(초점 = 공전의 중심)과 배율. 초점면에 있는 것은 화면에서 zoom배로 보인다.
 * yaw · pitch(라디안)는 초점을 중심으로 돈 정도다. 주지 않으면 이동해도 지금 방향을 유지한다.
 */
export interface CameraGoal {
  x: number
  y: number
  z: number
  zoom: number
  yaw?: number
  pitch?: number
}

export interface Bounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

type Vec3 = [number, number, number]

interface CameraView extends Required<CameraGoal> {
  /** 마우스 시차와 느린 표류로 카메라가 옆으로 밀린 거리(world, 카메라의 오른쪽 · 아래 방향) */
  offsetX: number
  offsetY: number
  /** 초점 거리(px) */
  focal: number
  width: number
  height: number
  /** 카메라의 오른쪽 · 아래 · 뒤 방향과 위치(world). orient()가 만든다 */
  right: Vec3
  down: Vec3
  back: Vec3
  position: Vec3
}

/**
 * 지금 화면에 적용된 카메라. cameraRig만 쓰고, 장면 · 환경 · 조작이 매 프레임 읽는다.
 * 카메라는 초점에서 뒤(back) 방향으로 focal / zoom 만큼 떨어져 초점을 바라본다.
 * yaw = pitch = 0이면 뒤 방향은 +z다(화면 오른쪽 +x, 아래 +y).
 */
export const cameraView: CameraView = {
  x: 0,
  y: 0,
  z: 0,
  zoom: 1,
  yaw: 0,
  pitch: 0,
  offsetX: 0,
  offsetY: 0,
  focal: 800,
  width: 1,
  height: 1,
  right: [1, 0, 0],
  down: [0, 1, 0],
  back: [0, 0, 1],
  position: [0, 0, 800],
}

/** 카메라에서 초점면까지의 거리 */
export function focusDistance(): number {
  return cameraView.focal / cameraView.zoom
}

/**
 * yaw · pitch와 초점 · 거리 · 시차에서 카메라의 방향과 위치를 다시 계산한다.
 * 회전은 세로축(yaw) 다음 카메라의 가로축(pitch) 순서다. 위치나 각도가 바뀐 뒤 한 번 부른다.
 */
export function orient(): void {
  const view = cameraView
  const cy = Math.cos(view.yaw), sy = Math.sin(view.yaw)
  const cp = Math.cos(view.pitch), sp = Math.sin(view.pitch)
  view.right[0] = cy; view.right[1] = 0; view.right[2] = -sy
  view.down[0] = sy * sp; view.down[1] = cp; view.down[2] = cy * sp
  view.back[0] = sy * cp; view.back[1] = -sp; view.back[2] = cy * cp
  const distance = focusDistance()
  for (let i = 0; i < 3; i++) {
    const focus = i === 0 ? view.x : i === 1 ? view.y : view.z
    view.position[i] = focus + view.back[i] * distance + view.right[i] * view.offsetX + view.down[i] * view.offsetY
  }
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

/**
 * world 좌표 → 화면. 카메라 뒤이거나 너무 가까우면 false. 결과는 out에 쓴다(프레임마다 객체를 만들지 않기 위해).
 * environment/shaders.ts의 toScreen()과 같은 식이어야 DOM과 입자가 한 공간에 놓인다.
 */
export function project(x: number, y: number, z: number, out: Projected): boolean {
  const { position: c, right: r, down: d, back: b } = cameraView
  const vx = x - c[0], vy = y - c[1], vz = z - c[2]
  const depth = -(vx * b[0] + vy * b[1] + vz * b[2])
  if (depth <= spaceConfig.camera.near) return false
  const scale = cameraView.focal / depth
  out.x = cameraView.width / 2 + (vx * r[0] + vy * r[1] + vz * r[2]) * scale
  out.y = cameraView.height / 2 + (vx * d[0] + vy * d[1] + vz * d[2]) * scale
  out.scale = scale
  out.depth = depth
  return true
}

/** 화면의 한 점이 초점면에서 가리키는 world 좌표 */
export function screenToFocusPlane(screen: Point): { x: number; y: number; z: number } {
  const { right: r, down: d } = cameraView
  const sx = cameraView.offsetX + (screen.x - cameraView.width / 2) / cameraView.zoom
  const sy = cameraView.offsetY + (screen.y - cameraView.height / 2) / cameraView.zoom
  return {
    x: cameraView.x + r[0] * sx + d[0] * sy,
    y: cameraView.y + r[1] * sx + d[1] * sy,
    z: cameraView.z + r[2] * sx + d[2] * sy,
  }
}
