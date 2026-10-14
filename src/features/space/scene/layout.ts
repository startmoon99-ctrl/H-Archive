import { CHROME } from '@/config/layout'
import { spaceConfig } from '@/config/space'
import type { Viewport } from '@/hooks/useViewport'
import type { Category, Project } from '@/types/archive'
import { clamp, degToRad } from '@/utils/math'
import { projectHue } from '@/utils/project'
import { seededRandom } from '@/utils/random'
import type { Bounds, CameraGoal } from '../camera/cameraView'

/**
 * 데이터 → 공간 배치. 위치를 저장하지 않고 만든 순서와 config만으로 계산하므로
 * 성단과 작품이 늘어나면 공간이 바깥으로 자란다.
 * 성단은 나선 위에, 작품은 성단 중심에서 바깥으로 퍼지는 씨앗 무늬(오래된 것이 안쪽)에 놓인다.
 */

export interface PlacedNode {
  project: Project
  hue: number
  x: number
  y: number
  z: number
  /** 성단 중심에서 떨어진 거리(world). 중심에서 제자리로 펼쳐지는 연출에 쓴다 */
  dx: number
  dy: number
  /** 프레임의 크기(world) */
  width: number
  height: number
  /** 성단 안에서의 순서. 차례로 펼쳐지는 데 쓴다 */
  index: number
  /** 0 ~ 1. 떠 있는 움직임이 작품마다 다르게 보이게 한다 */
  seed: number
}

export interface ClusterLayout {
  category: Category
  x: number
  y: number
  z: number
  radius: number
  /** 0 ~ 1. 숨 쉬는 속도와 박자가 성단마다 다르게 보이게 한다 */
  seed: number
  nodes: PlacedNode[]
  /** 이 성단을 화면에 채워 볼 때의 카메라 */
  focus: CameraGoal
}

export interface SpaceLayout {
  clusters: ClusterLayout[]
  bounds: Bounds
  /** 전체가 보이는 카메라 */
  overview: CameraGoal
}

const { cluster: clusterConfig, node: nodeConfig, labelSpacePx } = spaceConfig.layout
const { camera } = spaceConfig

/** 성단 중심 기준의 작품 위치 */
type DraftNode = Omit<PlacedNode, 'x' | 'y' | 'z'> & { dz: number }

interface ClusterDraft {
  category: Category
  nodes: DraftNode[]
  radius: number
  extentX: number
  extentY: number
}

function draftCluster(category: Category, projects: Project[], portrait: boolean): ClusterDraft {
  const ordered = [...projects].sort((a, b) => a.startedAt.localeCompare(b.startedAt))
  const random = seededRandom(category.id)
  const phase = random() * 360
  let extentX: number = nodeConfig.spread
  let extentY: number = nodeConfig.spread

  const nodes = ordered.map((project, index) => {
    const distance = nodeConfig.spread * Math.sqrt(index + nodeConfig.startIndex)
    const angle = degToRad(index * clusterConfig.goldenAngleDeg + phase)
    const along = Math.cos(angle) * distance
    const across = Math.sin(angle) * distance * nodeConfig.squash
    const grow = 1 + Math.min(project.timeline.length * nodeConfig.growPerEntry, nodeConfig.maxGrow)
    const width = nodeConfig.width * grow
    const height = nodeConfig.height * grow
    const dx = portrait ? across : along
    const dy = portrait ? along : across
    extentX = Math.max(extentX, Math.abs(dx) + width / 2)
    extentY = Math.max(extentY, Math.abs(dy) + height / 2)
    const seed = seededRandom(project.id)()
    return {
      project,
      hue: projectHue(project, category.hue),
      dx,
      dy,
      // 깊이: 만든 순서로 고르게 흩어(황금비 간격) 작품이 몇 개든 앞뒤가 섞이게 하고, seed로 조금 흔든다. 새로고침해도 같다.
      dz: (((index * 0.618034 + seed * 0.25) % 1) - 0.5) * nodeConfig.depthRange,
      width,
      height,
      index,
      seed,
    }
  })

  extentX += nodeConfig.margin
  extentY += nodeConfig.margin
  return { category, nodes, radius: Math.max(extentX, extentY), extentX, extentY }
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

export function buildSpaceLayout(categories: Category[], projects: Project[], viewport: Viewport): SpaceLayout {
  const portrait = viewport.height > viewport.width
  const ordered = [...categories].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  const drafts = ordered.map((category) =>
    draftCluster(
      category,
      projects.filter((project) => project.categoryId === category.id),
      portrait,
    ),
  )

  const largest = Math.max(nodeConfig.spread, ...drafts.map((draft) => draft.radius))
  const spacing = Math.max(clusterConfig.spacing, largest * clusterConfig.clearance)
  const focusArea = freeArea(viewport, true)
  const labelSpace = viewport.touchUi ? 0 : labelSpacePx * viewport.scale

  const clusters: ClusterLayout[] = drafts.map((draft, index) => {
    const distance = spacing * Math.sqrt(index + clusterConfig.startIndex)
    const angle = degToRad(index * clusterConfig.goldenAngleDeg + clusterConfig.rotationDeg)
    const along = Math.cos(angle) * distance
    const across = Math.sin(angle) * distance * clusterConfig.squash
    // 세로 화면에서는 세로로 길게 놓는다
    const x = portrait ? across : along
    const y = portrait ? along : across
    const z = (seededRandom(`depth:${draft.category.id}`)() - 0.5) * clusterConfig.depthRange

    const zoom = clamp(
      Math.min(
        (focusArea.width * camera.focusFill) / (draft.extentX * 2),
        (focusArea.height * camera.focusFill - labelSpace) / (draft.extentY * 2),
      ),
      camera.focusZoom.min,
      camera.focusZoom.max,
    )
    return {
      category: draft.category,
      x,
      y,
      z,
      radius: draft.radius,
      seed: seededRandom(`breath:${draft.category.id}`)(),
      nodes: draft.nodes.map(({ dz, ...rest }) => ({ ...rest, x: x + rest.dx, y: y + rest.dy, z: z + dz })),
      focus: { x, y: y - focusArea.offsetY / zoom, z, zoom },
    }
  })

  const bounds: Bounds =
    clusters.length === 0
      ? { minX: -spacing, maxX: spacing, minY: -spacing, maxY: spacing }
      : {
          minX: Math.min(...clusters.map((cluster) => cluster.x - cluster.radius)),
          maxX: Math.max(...clusters.map((cluster) => cluster.x + cluster.radius)),
          minY: Math.min(...clusters.map((cluster) => cluster.y - cluster.radius)),
          maxY: Math.max(...clusters.map((cluster) => cluster.y + cluster.radius)),
        }

  const area = freeArea(viewport, false)
  const zoom = clamp(
    Math.min(area.width / (bounds.maxX - bounds.minX), area.height / (bounds.maxY - bounds.minY)) *
      camera.overviewPadding,
    camera.overviewZoom.min,
    camera.overviewZoom.max,
  )

  return {
    clusters,
    bounds,
    overview: {
      x: (bounds.minX + bounds.maxX) / 2,
      y: (bounds.minY + bounds.maxY) / 2 - area.offsetY / zoom,
      z: 0,
      zoom,
    },
  }
}
