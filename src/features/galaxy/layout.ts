import { galaxyConfig } from '@/config/galaxy'
import { CHROME } from '@/config/layout'
import type { Viewport } from '@/hooks/useViewport'
import type { Category, Project } from '@/types/archive'
import { clamp, degToRad } from '@/utils/math'
import { projectHue } from '@/utils/project'
import { hashString } from '@/utils/random'
import type { CameraTarget } from './cameraState'

/**
 * 데이터 → 은하 배치. 위치를 저장하지 않고 순서(만든 날짜)와 config만으로 계산하므로
 * 항성계와 프로젝트가 늘어나면 은하가 바깥으로 자란다.
 */

export interface PlacedProject {
  project: Project
  hue: number
  /** 항성계에 들어갔을 때의 지름(px) */
  size: number
  /** 궤도 위의 각도(deg) */
  angle: number
  /** 항성계 안에서의 순서. 차례로 등장하는 데 쓴다. */
  index: number
  /** 기록 수만큼 도는 작은 위성 */
  moons: number
}

export interface RingLayout {
  radius: number
  /** 한 바퀴 도는 시간(초) */
  duration: number
  reverse: boolean
  items: PlacedProject[]
}

export interface SystemLayout {
  category: Category
  x: number
  y: number
  starSize: number
  rings: RingLayout[]
  outerRadius: number
  projectCount: number
  /** 이 항성계를 화면에 채워 볼 때의 카메라 */
  focus: CameraTarget
}

export interface Bounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export interface GalaxyLayout {
  systems: SystemLayout[]
  bounds: Bounds
  /** 은하 전체가 보이는 카메라 */
  overview: CameraTarget
}

const { spiral, star, orbit, planet, camera } = galaxyConfig

function buildRings(category: Category, projects: Project[], scale: number): RingLayout[] {
  const ordered = [...projects].sort((a, b) => a.startedAt.localeCompare(b.startedAt))
  const phase = hashString(category.id) % 360
  const rings: RingLayout[] = []
  let capacity = orbit.baseCapacity
  let start = 0

  while (start < ordered.length) {
    const ringIndex = rings.length
    const members = ordered.slice(start, start + capacity)
    rings.push({
      radius: orbit.firstRadius + ringIndex * orbit.gap,
      duration: orbit.baseDuration + ringIndex * orbit.durationStep,
      reverse: ringIndex % 2 === 1,
      items: members.map((project, slot) => ({
        project,
        hue: projectHue(project, category.hue),
        size:
          clamp(planet.baseSize + project.timeline.length * planet.perEntry, planet.baseSize, planet.maxSize) * scale,
        angle: phase + ringIndex * 47 + (slot / members.length) * 360,
        index: start + slot,
        moons: Math.min(project.timeline.length, planet.maxMoons),
      })),
    })
    start += capacity
    capacity += orbit.capacityStep
  }
  return rings
}

/** 고정 UI(상단 바 · 하단 Dock · Rail)에 가려지지 않는 영역 */
function freeArea(viewport: Viewport, withRail: boolean) {
  const top = viewport.touchUi ? CHROME.hudHeight * viewport.scale : 0
  const bottom = viewport.touchUi
    ? (CHROME.dockHeight + (withRail ? CHROME.railHeight : 0)) * viewport.scale
    : 0
  return {
    width: viewport.width,
    height: viewport.height - top - bottom,
    /** 보이는 영역의 중심이 화면 중심에서 벗어난 정도(px) */
    offsetY: (top - bottom) / 2,
  }
}

function focusCamera(x: number, y: number, outerRadius: number, viewport: Viewport): CameraTarget {
  const area = freeArea(viewport, true)
  // 행성과 이름표는 화면 px 크기가 고정이므로 그만큼을 뺀 뒤 궤도를 채운다
  const reserved = (planet.maxSize + (viewport.touchUi ? 0 : planet.labelSpace * 2)) * viewport.scale
  const usable = Math.min(area.width, area.height) * camera.focusFill - reserved
  const zoom = clamp(usable / (outerRadius * 2), camera.focusZoom.min, camera.focusZoom.max)
  return { x, y: y - area.offsetY / zoom, zoom }
}

export function buildGalaxyLayout(categories: Category[], projects: Project[], viewport: Viewport): GalaxyLayout {
  const ordered = [...categories].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const drafts = ordered.map((category) => {
    const members = projects.filter((project) => project.categoryId === category.id)
    const rings = buildRings(category, members, viewport.scale)
    const outerRadius = orbit.firstRadius + Math.max(rings.length - 1, 0) * orbit.gap
    return { category, rings, outerRadius, projectCount: members.length }
  })

  const largest = Math.max(orbit.firstRadius, ...drafts.map((draft) => draft.outerRadius))
  const spacing = Math.max(spiral.spacing, largest * spiral.clearance)
  const portrait = viewport.height > viewport.width

  const systems: SystemLayout[] = drafts.map((draft, index) => {
    const distance = spacing * Math.sqrt(index + spiral.startIndex)
    const angle = degToRad(index * spiral.goldenAngleDeg + spiral.rotationDeg)
    const along = Math.cos(angle) * distance
    const across = Math.sin(angle) * distance * spiral.squash
    // 세로 화면에서는 은하를 세로로 길게 놓는다
    const x = portrait ? across : along
    const y = portrait ? along : across
    return {
      ...draft,
      x,
      y,
      starSize: Math.min(star.baseSize + draft.projectCount * star.perProject, star.maxSize),
      focus: focusCamera(x, y, draft.outerRadius, viewport),
    }
  })

  const bounds: Bounds =
    systems.length === 0
      ? { minX: -spacing, maxX: spacing, minY: -spacing, maxY: spacing }
      : {
          minX: Math.min(...systems.map((system) => system.x - system.outerRadius)),
          maxX: Math.max(...systems.map((system) => system.x + system.outerRadius)),
          minY: Math.min(...systems.map((system) => system.y - system.outerRadius)),
          maxY: Math.max(...systems.map((system) => system.y + system.outerRadius)),
        }

  const area = freeArea(viewport, false)
  const zoom = clamp(
    Math.min(area.width / (bounds.maxX - bounds.minX), area.height / (bounds.maxY - bounds.minY)) *
      camera.overviewPadding,
    camera.overviewZoom.min,
    camera.overviewZoom.max,
  )

  return {
    systems,
    bounds,
    overview: {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2 - area.offsetY / zoom,
      zoom,
    },
  }
}
