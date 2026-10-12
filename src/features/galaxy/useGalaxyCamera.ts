import { useEffect, useRef, type RefObject } from 'react'
import { galaxyConfig } from '@/config/galaxy'
import { galaxyMotion } from '@/config/motion'
import { useLatest } from '@/hooks/useLatest'
import type { Viewport } from '@/hooks/useViewport'
import { pointer } from '@/motion/pointer'
import { getMotion } from '@/motion/runtime'
import { onTick } from '@/motion/ticker'
import type { Point } from '@/types/ui'
import { clamp, lerp, smoothing } from '@/utils/math'
import { cameraState, screenToWorld, type CameraTarget } from './cameraState'
import type { Bounds } from './layout'

interface Tween {
  from: CameraTarget
  to: CameraTarget
  start: number
  duration: number
}

interface CameraOptions {
  stageRef: RefObject<HTMLElement | null>
  worldRef: RefObject<HTMLElement | null>
  tiltRef: RefObject<HTMLElement | null>
  viewport: Viewport
  /** 지금 화면(은하 · 항성계 · 프로젝트)이 요구하는 카메라 */
  target: CameraTarget
  /** 목표까지 이동하는 시간(ms). 0이면 바로 옮긴다. */
  travelMs: number
  zoomRange: { min: number; max: number }
  bounds: Bounds
  /** false면 루프를 멈춘다(은하가 가려졌을 때) */
  active: boolean
  /** 사용자가 직접 확대 · 축소를 마쳤을 때 */
  onZoomSettled: (zoom: number) => void
  /** 마우스가 가리키는 world 좌표. 벗어나면 null */
  onHover: (world: Point | null) => void
}

const { camera: cameraConfig } = galaxyConfig
const PINCH_POINTERS = 2
/** 놓기 직전에 멈춰 있었다면 관성을 주지 않는다 */
const STALE_VELOCITY_MS = 80

/** 카메라가 은하에서 너무 멀리 벗어나지 않게 한다 */
function clampToBounds(bounds: Bounds): void {
  const pad = cameraConfig.boundsPadding
  cameraState.x = clamp(cameraState.x, bounds.minX - pad, bounds.maxX + pad)
  cameraState.y = clamp(cameraState.y, bounds.minY - pad, bounds.maxY + pad)
}

/**
 * 은하 카메라: 목표 지점으로의 이동(tween), 드래그 · 관성 · 휠 · 핀치, 마우스 시차.
 * 결과는 world / tilt 요소의 transform으로만 쓰고 React 상태를 건드리지 않는다.
 */
export function useGalaxyCamera(options: CameraOptions): void {
  const latest = useLatest(options)
  const tween = useRef<Tween | null>(null)
  const velocity = useRef<Point>({ x: 0, y: 0 })
  const dragging = useRef(false)
  const placed = useRef(false)

  const { target, active, stageRef } = options

  // 목표가 바뀌면 그곳으로 이동한다
  useEffect(() => {
    const { travelMs, target: to } = latest.current
    velocity.current = { x: 0, y: 0 }
    if (!placed.current || travelMs <= 0) {
      Object.assign(cameraState, to)
      tween.current = null
      placed.current = true
      return
    }
    tween.current = { from: { ...cameraState }, to: { ...to }, start: performance.now(), duration: travelMs }
  }, [target.x, target.y, target.zoom, latest])

  useEffect(() => {
    if (!active) return
    const tilt: Point = { x: 0, y: 0 }

    return onTick((dt, now) => {
      const { viewport, worldRef, tiltRef, bounds } = latest.current
      const current = tween.current

      if (current) {
        const t = clamp((now - current.start) / current.duration, 0, 1)
        const eased = galaxyMotion.camera.travelEase(t)
        const zoom = current.from.zoom * (current.to.zoom / current.from.zoom) ** eased
        // 목표 지점이 화면 위에서 일정하게 중심으로 다가오도록 위치를 정한다
        const remaining = ((1 - eased) * current.from.zoom) / zoom
        cameraState.zoom = zoom
        cameraState.x = current.to.x - (current.to.x - current.from.x) * remaining
        cameraState.y = current.to.y - (current.to.y - current.from.y) * remaining
        if (t >= 1) tween.current = null
      } else if (!dragging.current) {
        const speed = Math.hypot(velocity.current.x, velocity.current.y) * cameraState.zoom
        if (speed > galaxyMotion.camera.minInertia) {
          cameraState.x += velocity.current.x * dt
          cameraState.y += velocity.current.y * dt
          const friction = galaxyMotion.camera.inertiaFriction ** (dt / 16)
          velocity.current.x *= friction
          velocity.current.y *= friction
          clampToBounds(bounds)
        }
      }

      const { parallax } = getMotion()
      const follow = smoothing(galaxyMotion.parallax.smoothing, dt)
      tilt.x = lerp(tilt.x, pointer.active ? pointer.nx * parallax : 0, follow)
      tilt.y = lerp(tilt.y, pointer.active ? pointer.ny * parallax : 0, follow)

      const { zoom } = cameraState
      const world = worldRef.current
      if (world) {
        const x = viewport.width / 2 - cameraState.x * zoom
        const y = viewport.height / 2 - cameraState.y * zoom
        world.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${zoom})`
      }
      const tiltElement = tiltRef.current
      if (tiltElement) {
        const { tiltDeg, worldShift, perspective } = galaxyMotion.parallax
        tiltElement.style.transform =
          `perspective(${perspective}px) rotateX(${-tilt.y * tiltDeg}deg) rotateY(${tilt.x * tiltDeg}deg) ` +
          `translate3d(${-tilt.x * worldShift}px, ${-tilt.y * worldShift}px, 0)`
      }
    })
  }, [active, latest])

  // 드래그 · 관성 · 휠 · 핀치
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return

    const pointers = new Map<number, Point>()
    let moved = 0
    let lastMoveAt = 0
    let pinchDistance = 0
    let suppressClick = false
    let intentTimer = 0

    const takeOver = () => {
      tween.current = null
    }
    /** 화면의 한 점을 고정한 채 확대 · 축소한다 */
    const zoomAt = (screen: Point, factor: number) => {
      const { viewport, zoomRange, bounds } = latest.current
      const before = screenToWorld(screen, viewport)
      cameraState.zoom = clamp(cameraState.zoom * factor, zoomRange.min, zoomRange.max)
      const after = screenToWorld(screen, viewport)
      cameraState.x += before.x - after.x
      cameraState.y += before.y - after.y
      clampToBounds(bounds)
    }
    const scheduleIntent = () => {
      window.clearTimeout(intentTimer)
      intentTimer = window.setTimeout(
        () => latest.current.onZoomSettled(cameraState.zoom),
        cameraConfig.zoomIntentDelayMs,
      )
    }
    const pinchSpan = () => {
      const [a, b] = [...pointers.values()]
      return Math.hypot(a.x - b.x, a.y - b.y)
    }

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return
      suppressClick = false
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
      if (pointers.size === 1) {
        moved = 0
        velocity.current = { x: 0, y: 0 }
      } else if (pointers.size === PINCH_POINTERS) {
        pinchDistance = pinchSpan()
      }
    }

    const onPointerMove = (event: PointerEvent) => {
      const point = { x: event.clientX, y: event.clientY }
      const previous = pointers.get(event.pointerId)
      if (!previous) {
        if (event.pointerType === 'mouse') latest.current.onHover(screenToWorld(point, latest.current.viewport))
        return
      }
      pointers.set(event.pointerId, point)

      if (pointers.size === PINCH_POINTERS) {
        const [a, b] = [...pointers.values()]
        const span = pinchSpan()
        takeOver()
        suppressClick = true
        zoomAt({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, span / pinchDistance)
        pinchDistance = span
        return
      }

      const dx = point.x - previous.x
      const dy = point.y - previous.y
      moved += Math.hypot(dx, dy)
      if (!dragging.current && moved > cameraConfig.dragThreshold) {
        dragging.current = true
        takeOver()
        stage.setPointerCapture(event.pointerId)
        stage.dataset.dragging = 'true'
      }
      if (!dragging.current) return

      const now = performance.now()
      const elapsed = Math.max(now - lastMoveAt, 1)
      lastMoveAt = now
      const worldDx = -dx / cameraState.zoom
      const worldDy = -dy / cameraState.zoom
      cameraState.x += worldDx
      cameraState.y += worldDy
      clampToBounds(latest.current.bounds)
      velocity.current = { x: worldDx / elapsed, y: worldDy / elapsed }
    }

    const onPointerUp = (event: PointerEvent) => {
      if (!pointers.delete(event.pointerId)) return
      if (pinchDistance > 0 && pointers.size < PINCH_POINTERS) {
        pinchDistance = 0
        scheduleIntent()
      }
      if (dragging.current && pointers.size === 0) {
        dragging.current = false
        suppressClick = true
        delete stage.dataset.dragging
        if (performance.now() - lastMoveAt > STALE_VELOCITY_MS) velocity.current = { x: 0, y: 0 }
      }
    }

    // 끌어서 옮긴 직후의 click이 항성계 선택으로 이어지지 않게 한다
    const onClickCapture = (event: MouseEvent) => {
      if (!suppressClick) return
      suppressClick = false
      event.stopPropagation()
      event.preventDefault()
    }

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const lineHeight = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? 16 : 1
      takeOver()
      velocity.current = { x: 0, y: 0 }
      zoomAt({ x: event.clientX, y: event.clientY }, Math.exp(-event.deltaY * lineHeight * cameraConfig.wheelSensitivity))
      scheduleIntent()
    }

    const onPointerLeave = () => latest.current.onHover(null)

    stage.addEventListener('pointerdown', onPointerDown)
    stage.addEventListener('pointermove', onPointerMove)
    stage.addEventListener('pointerup', onPointerUp)
    stage.addEventListener('pointercancel', onPointerUp)
    stage.addEventListener('pointerleave', onPointerLeave)
    stage.addEventListener('click', onClickCapture, true)
    stage.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      window.clearTimeout(intentTimer)
      stage.removeEventListener('pointerdown', onPointerDown)
      stage.removeEventListener('pointermove', onPointerMove)
      stage.removeEventListener('pointerup', onPointerUp)
      stage.removeEventListener('pointercancel', onPointerUp)
      stage.removeEventListener('pointerleave', onPointerLeave)
      stage.removeEventListener('click', onClickCapture, true)
      stage.removeEventListener('wheel', onWheel)
    }
  }, [stageRef, latest])
}
