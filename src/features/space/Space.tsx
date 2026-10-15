import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useArchiveNav, useArchiveRoute } from '@/app/useArchiveRoute'
import { projectMotion } from '@/config/motion'
import { spaceConfig } from '@/config/space'
import { useLatest } from '@/hooks/useLatest'
import { useViewport } from '@/hooks/useViewport'
import { motionMs } from '@/motion/runtime'
import { onTick } from '@/motion/ticker'
import { provideWorkLocation } from '@/motion/travel'
import { useArchiveStore } from '@/store/archiveStore'
import { selectActiveMotion, useMotionStore } from '@/store/motionStore'
import { usePlacementStore } from '@/store/placementStore'
import { useSkyStore } from '@/store/skyStore'
import { useUiStore, type TravelOrigin } from '@/store/uiStore'
import type { ID } from '@/types/archive'
import { cssVars } from '@/utils/css'
import { createCameraRig } from './camera/cameraRig'
import { cameraView, type CameraGoal } from './camera/cameraView'
import { PostEffects } from './effects/PostEffects'
import { createEnvironment, type Environment } from './environment/environment'
import { particleFieldKey } from './environment/particleField'
import { attachArrangeControls } from './interaction/arrangeControls'
import type { ControlOptions } from './interaction/drag'
import { attachPointerControls } from './interaction/pointerControls'
import { attachTouchControls } from './interaction/touchControls'
import { ClusterNode, type ClusterState } from './nodes/ClusterNode'
import { WorkNode, type CaptionPlacement, type NodeState } from './nodes/WorkNode'
import { createArrangement } from './scene/arrangement'
import { buildSpaceLayout, placementOf, type ClusterLayout } from './scene/layout'
import { createSceneUpdater, type SceneElements } from './scene/sceneUpdater'
import { ClusterTitle } from './ui/ClusterTitle'
import { ArrangeBar } from './ui/ArrangeBar'
import { ProjectRail } from './ui/ProjectRail'
import { SpaceSummary } from './ui/SpaceSummary'
import './space.css'
import './effects/cluster-effects.css'
import './effects/node-effects.css'

const { camera, interaction } = spaceConfig

interface ActiveNode {
  id: ID
  caption: CaptionPlacement
}

/**
 * 누른 요소에서 이미지가 보이는 자리와 그 이미지. 상세 화면이 이 이미지를 이어받아 연다.
 * 이미지가 없는 작품은 자리만 건넨다(그 자리에서 창이 열린다).
 */
function originOf(element: HTMLElement): TravelOrigin {
  const visual = element.querySelector<HTMLElement>('.node__frame, .media-preview') ?? element
  const rect = visual.getBoundingClientRect()
  return {
    x: rect.left,
    y: rect.top,
    width: rect.width,
    height: rect.height,
    src: visual.querySelector('img')?.currentSrc || undefined,
  }
}

/** 프로젝트 화면이 공간을 완전히 덮은 뒤에 true가 된다. 그동안 공간은 그리기를 멈춘다. */
function useCovered(hidden: boolean): boolean {
  const [covered, setCovered] = useState(false)
  useEffect(() => {
    if (!hidden) {
      setCovered(false)
      return
    }
    const timer = window.setTimeout(() => setCovered(true), motionMs('travel'))
    return () => window.clearTimeout(timer)
  }, [hidden])
  return covered
}

/**
 * 공간 화면의 조립. 각 부분은 독립된 모듈이고 여기서는 연결만 한다.
 *   camera(어디를 보는가) ← interaction(입력) · 주소(목표)
 *   scene(배치 → DOM 위치) · environment(입자) ← camera
 *   effects(빛 · 품질 · 화면 효과) ← scene이 쓴 상태값
 * 항상 떠 있으며 프로젝트 화면은 이 위에 겹쳐 열린다.
 */
export function Space() {
  const route = useArchiveRoute()
  const nav = useArchiveNav()
  const viewport = useViewport()
  const categories = useArchiveStore((state) => state.categories)
  const projects = useArchiveStore((state) => state.projects)
  const ready = useArchiveStore((state) => state.status === 'ready')
  const density = useMotionStore((state) => selectActiveMotion(state).particles)
  const introPhase = useUiStore((state) => state.introPhase)
  const introRevealMs = useUiStore((state) => state.introRevealMs)
  const bornProjectId = useUiStore((state) => state.bornProjectId)
  const setBornProject = useUiStore((state) => state.setBornProject)
  const receiving = useUiStore((state) => state.isDraggingFiles)
  const awayProjectId = useUiStore((state) => state.awayProjectId)
  const arranging = useUiStore((state) => state.arranging)
  const viewResetRun = useUiStore((state) => state.viewResetRun)
  const placements = usePlacementStore((state) => state.placements)
  const skyLevel = useSkyStore((state) => state.level)
  const meteorsOn = useSkyStore((state) => state.meteors)
  const orbitLevel = useSkyStore((state) => state.orbit)

  const stageRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const environmentRef = useRef<Environment | null>(null)
  const placedRef = useRef(false)
  /** 직전에 카메라를 옮겼을 때의 주소. 작품을 열고 닫는 이동인지 가려낸다 */
  const previousRef = useRef({ view: route.view, categoryId: route.categoryId, projectId: route.projectId })
  /** 방금 상세 화면에서 돌아온 작품. 주변 입자가 잠시 감싼다 */
  const returnedRef = useRef<ID | null>(null)
  /** 작품을 누르기 직전의 카메라. 닫으면 이 자리로 되돌아온다 */
  const departureRef = useRef<CameraGoal | null>(null)
  /** 직전에 카메라를 옮겼을 때 성단 위치 조절 중이었는가 */
  const arrangingRef = useRef(arranging)
  const [elements] = useState<SceneElements>(() => ({ clusters: new Map(), nodes: new Map() }))
  const [rig] = useState(createCameraRig)
  const [updater] = useState(() => createSceneUpdater(elements))
  const [arrangement] = useState(createArrangement)
  const [active, setActive] = useState<ActiveNode | null>(null)

  const layout = useMemo(
    () => buildSpaceLayout(categories, projects, viewport, placements),
    [categories, projects, viewport, placements],
  )
  const focused: ClusterLayout | null =
    layout.clusters.find((cluster) => cluster.category.id === route.categoryId) ?? null
  const focusedId = focused?.category.id ?? null
  const covered = useCovered(route.view === 'project')

  // 가만히 있을 때의 공전: 메인 화면과 성단 안에서. 성단 안에서는 작품이 화면을 채우고 있어 범위를 줄인다.
  // 상세 화면 · 인트로 · 성단 위치 조절 중에는 멈춘다
  useEffect(() => {
    const browsing = route.view === 'galaxy' || route.view === 'system'
    const reach = route.view === 'system' ? camera.idleOrbit.clusterReach : 1
    rig.setIdleOrbit(browsing && introPhase === 'done' && !arranging && !covered, orbitLevel, reach)
  }, [rig, route.view, introPhase, arranging, covered, orbitLevel])

  // ── 카메라: 주소가 요구하는 목표로 이동한다 ─────────────────────────────
  const goal = useMemo<CameraGoal>(() => {
    if (introPhase === 'playing') {
      return { ...layout.overview, zoom: layout.overview.zoom * camera.introZoomFactor }
    }
    if (!focused) return arranging ? { ...layout.overview, zoom: layout.overview.zoom * camera.arrangeZoomFactor } : layout.overview
    // 작품을 열면 카메라가 그 작품의 자리(x · y · z)로 다가간다. 주변은 깊이에 따라 저절로 시차가 생긴다.
    if (route.view === 'project') {
      const work = focused.nodes.find((node) => node.project.id === route.projectId)
      const zoom = focused.focus.zoom * camera.projectZoomFactor
      return work ? { x: work.x, y: work.y, z: work.z, zoom } : { ...focused.focus, zoom }
    }
    return focused.focus
  }, [introPhase, layout, focused, route.view, route.projectId, arranging])

  useEffect(() => {
    rig.setViewport(viewport.width, viewport.height)
  }, [rig, viewport.width, viewport.height])

  // 지금 화면의 처음 구도(정면). 메인 화면의 Esc · 빈 곳 더블클릭이 이리로 되돌린다
  const home = useMemo(() => ({ ...goal, yaw: 0, pitch: 0 }), [goal])

  useEffect(() => {
    rig.setLimits({
      bounds: layout.bounds,
      ...(focused
        ? { zoomMin: focused.focus.zoom * camera.exitFactor * 0.8, zoomMax: focused.focus.zoom * 2 }
        : { zoomMin: layout.overview.zoom * 0.6, zoomMax: layout.overview.zoom * camera.enterFactor * 1.5 }),
    })
  }, [rig, layout, focused])

  const travelContext = useLatest({ route, introPhase, introRevealMs })
  const { x: goalX, y: goalY, z: goalZ, zoom: goalZoom } = goal

  useEffect(() => {
    const before = previousRef.current
    const { route, introPhase, introRevealMs } = travelContext.current
    previousRef.current = { view: route.view, categoryId: route.categoryId, projectId: route.projectId }
    // 성단 위치 조절 중에는 성단을 옮겨 전체 보기의 범위가 달라져도 카메라가 따라 움직이지 않는다.
    // 들어올 때는 전체 보기로, 마치면 바뀐 배치가 다 보이는 자리로 옮겨 간다
    const wasArranging = arrangingRef.current
    arrangingRef.current = arranging
    if (arranging && wasArranging) return
    // 같은 성단 안에서 작품을 열면 그 작품으로 다가가고, 닫으면 누르기 직전의 자리로 그대로 물러난다
    const sameCluster = before.categoryId === route.categoryId
    const opening = sameCluster && before.view === 'system' && route.view === 'project'
    const returning = sameCluster && before.view === 'project' && route.view === 'system'
    const cruise = motionMs(opening || returning ? projectMotion.approach : 'travel')
    returnedRef.current = returning ? before.projectId : null
    if (returning) environmentRef.current?.wrap(cruise)
    if (opening) departureRef.current = rig.current()
    else if (!returning) departureRef.current = null
    // 작품으로 다가갈 때는 지금 돌아 본 방향 그대로, 그 밖의 이동(성단 · 전체 보기)은 정면으로 돌아오며 간다
    const target = (returning && departureRef.current) || {
      x: goalX,
      y: goalY,
      z: goalZ,
      zoom: goalZoom,
      ...(opening ? {} : { yaw: 0, pitch: 0 }),
    }

    const travelMs = introPhase === 'playing' ? 0 : introPhase === 'revealing' ? introRevealMs : cruise
    if (!placedRef.current || travelMs <= 0) {
      rig.jumpTo(target)
      placedRef.current = true
    } else {
      rig.flyTo(target, travelMs, opening || returning ? projectMotion.approachEase : undefined)
    }
    if (returning) departureRef.current = null
    // 좌표가 바뀔 때만 이동한다. 단계/시간만 바뀌어 진행 중인 이동이 재시작되지 않게 최신 ref로 읽는다.
  }, [rig, goalX, goalY, goalZ, goalZoom, travelContext, arranging])

  // 최신 값은 ref로 읽어 루프와 조작을 다시 걸지 않는다
  const latest = useLatest({ route, layout, focused, focusedId, viewport, nav, home, activeId: active?.id ?? null })

  // 처음 구도로 부드럽게 돌아간다(메인 화면의 Esc · 빈 곳 더블클릭 · 두 번 탭). 상세 화면에서는 하지 않는다
  const resetView = useCallback(() => {
    const current = latest.current
    if (current.route.view === 'project') return
    rig.flyTo(current.home, motionMs('travel'))
  }, [rig, latest])

  useEffect(() => {
    if (viewResetRun > 0) resetView()
  }, [viewResetRun, resetView])

  // ── 조작: 마우스와 터치를 각각 붙인다 ───────────────────────────────────
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const options: ControlOptions = {
      // 전체 보기에서 충분히 확대하면 가까운 성단으로 들어가고, 성단에서 충분히 축소하면 나온다
      onZoomSettled: (zoom) => {
        const current = latest.current
        // 성단 위치 조절 중에는 확대해도 성단으로 들어가지 않는다
        if (useUiStore.getState().arranging) return
        if (current.route.view === 'galaxy' && zoom >= current.layout.overview.zoom * camera.enterFactor) {
          const distanceTo = (cluster: ClusterLayout) =>
            Math.hypot(cluster.x - cameraView.x, cluster.y - cameraView.y)
          const nearest = [...current.layout.clusters].sort((a, b) => distanceTo(a) - distanceTo(b))[0]
          if (nearest) current.nav.toSystem(nearest.category.id)
        } else if (
          current.route.view === 'system' &&
          current.focused &&
          zoom <= current.focused.focus.zoom * camera.exitFactor
        ) {
          current.nav.toGalaxy()
        }
      },
      // 빈 곳을 두 번 누르면: 성단 안에서는 메인 화면으로 나가고, 메인 화면에서는 처음 구도로 돌아간다
      onDoubleTap: () => {
        if (latest.current.route.view === 'system') latest.current.nav.toGalaxy()
        else resetView()
      },
    }
    const detachPointer = attachPointerControls(stage, rig, options)
    const detachTouch = attachTouchControls(stage, rig, options)
    return () => {
      detachPointer()
      detachTouch()
    }
  }, [rig, latest, resetView])

  // 성단 위치 조절: 성단을 잡아 끌면 따라오고, 놓은 자리는 저장된다(배치가 그 자리를 따른다)
  useEffect(() => {
    const stage = stageRef.current
    if (!stage || !arranging) return
    return attachArrangeControls(stage, arrangement, {
      positionOf: (id) => {
        const cluster = latest.current.layout.clusters.find((item) => item.category.id === id)
        return arrangement.positionOf(id) ?? (cluster ? { x: cluster.x, y: cluster.y, z: cluster.z } : null)
      },
      onDrop: (id, at) => {
        const { width, height } = latest.current.viewport
        usePlacementStore.getState().place(id, placementOf(at.x, at.y, at.z, height > width))
      },
    })
  }, [arranging, arrangement, latest])

  // ── 환경: 입자 ──────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    try {
      environmentRef.current = createEnvironment(canvas, viewport.touchUi)
    } catch (error) {
      console.warn('[space] 배경 입자를 그릴 수 없습니다.', error)
    }
    return () => {
      environmentRef.current?.dispose()
      environmentRef.current = null
    }
  }, [viewport.touchUi])

  useEffect(() => {
    environmentRef.current?.resize(viewport.width, viewport.height)
  }, [viewport.width, viewport.height, viewport.touchUi])

  // 별빛 설정. 입자를 만들기 전에 알려 주어야 반짝이는 별의 비율이 처음부터 맞다. 별똥별은 인트로가 끝난 뒤에만
  useEffect(() => {
    environmentRef.current?.setSky(skyLevel, meteorsOn && introPhase === 'done')
  }, [skyLevel, meteorsOn, introPhase, viewport.touchUi])

  // 성단의 구성이 달라졌을 때만 입자를 다시 만든다
  const fieldKey = particleFieldKey(layout)
  useEffect(() => {
    environmentRef.current?.rebuild(latest.current.layout, density, viewport.scale)
  }, [fieldKey, density, viewport.scale, viewport.touchUi, latest])

  // ── 한 프레임: 카메라 → 장면(DOM 위치) → 환경(입자 · 선) ────────────────
  useEffect(() => {
    if (covered) {
      // 상세 화면 뒤: 성단 · 작품(DOM)은 쉬고, 입자만 낮은 빈도로 이어 그린다(카메라의 느린 표류 · 시차는 그대로)
      let elapsed = 0
      return onTick((dt, now) => {
        rig.update(dt, now)
        elapsed += dt
        if (elapsed < spaceConfig.quality.behindFrameMs) return
        environmentRef.current?.draw(elapsed, now, {
          lines: updater.lines,
          lineVertices: 0,
          overview: false,
          wrapPoint: null,
          behind: true,
        })
        elapsed = 0
      })
    }
    return onTick((dt, now) => {
      rig.update(dt, now)
      const current = latest.current
      arrangement.update(current.layout, dt)
      const lineVertices = updater.update(
        {
          layout: current.layout,
          focusedId: current.focusedId,
          activeNodeId: current.activeId,
          touchUi: current.viewport.touchUi,
          overview: current.route.view === 'galaxy',
          arrangement,
        },
        dt,
        now,
      )
      const returned = returnedRef.current ? updater.rectOf(returnedRef.current) : null
      environmentRef.current?.draw(dt, now, {
        lines: updater.lines,
        lineVertices,
        overview: current.route.view === 'galaxy',
        wrapPoint: returned && { x: returned.x + returned.width / 2, y: returned.y + returned.height / 2 },
        moving: arrangement.moving(),
      })
    })
  }, [covered, rig, updater, arrangement, latest])

  // 상세 화면이 작품의 이미지를 이어받고 돌려보낼 자리를 알려 준다
  useEffect(
    () =>
      provideWorkLocation({
        locate: updater.rectOf,
        measure: (id) => {
          const frame = elements.nodes.get(id)?.querySelector('.node__frame')
          if (!frame) return null
          const rect = frame.getBoundingClientRect()
          return { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
        },
      }),
    [updater, elements],
  )

  // 다른 성단으로 옮기면 선택을 푼다
  useEffect(() => setActive(null), [focusedId])

  useEffect(() => {
    if (!bornProjectId) return
    const timer = window.setTimeout(() => setBornProject(null), motionMs('travel') + motionMs('cinematic') * 1.5)
    return () => window.clearTimeout(timer)
  }, [bornProjectId, setBornProject])

  // ── 작품 선택 ───────────────────────────────────────────────────────────
  const registerCluster = useCallback(
    (id: ID, element: HTMLElement | null) => {
      if (element) elements.clusters.set(id, element)
      else elements.clusters.delete(id)
    },
    [elements],
  )
  const registerNode = useCallback(
    (id: ID, element: HTMLElement | null) => {
      if (element) elements.nodes.set(id, element)
      else elements.nodes.delete(id)
    },
    [elements],
  )

  const activateNode = useCallback(
    (id: ID, element: HTMLElement) => {
      const { width, height, scale } = latest.current.viewport
      const rect = element.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      // 설명은 성단 중심을 가리지 않게 바깥쪽에 띄우고, 화면 밖으로 나갈 때만 안쪽으로 돌린다
      const needed = rect.width / 2 + interaction.captionWidthPx * scale * 1.15
      const onLeftHalf = centerX < width / 2
      const fitsOutward = onLeftHalf ? centerX > needed : width - centerX > needed
      setActive({
        id,
        caption: {
          side: onLeftHalf === fitsOutward ? 'left' : 'right',
          align: centerY < height / 3 ? 'start' : centerY > (height * 2) / 3 ? 'end' : 'center',
        },
      })
    },
    [latest],
  )

  const deactivateNode = useCallback(() => {
    // 터치 환경에서는 다른 것을 고를 때까지 선택을 유지한다
    if (!latest.current.viewport.touchUi) setActive(null)
  }, [latest])

  const pressNode = useCallback(
    (id: ID, element: HTMLElement) => {
      const current = latest.current
      // 터치: Rail의 카드와 같이 한 번 누르면 연다. 돌아왔을 때 Rail이 이 작품에 맞춰져 있도록 선택도 함께 옮긴다.
      // (끌기 · Pinch 뒤의 click은 interaction의 click guard가 막으므로 여기까지 오지 않는다)
      if (current.viewport.touchUi && current.activeId !== id) activateNode(id, element)
      current.nav.toProject(id, originOf(element))
    },
    [latest, activateNode],
  )

  // 성단 위치 조절 중에는 성단을 눌러도 들어가지 않는다(끌기만 한다)
  const selectCluster = useCallback(
    (id: ID) => {
      if (!useUiStore.getState().arranging) latest.current.nav.toSystem(id)
    },
    [latest],
  )

  const browseNode = useCallback((id: ID) => setActive({ id, caption: { side: 'right', align: 'center' } }), [])
  const openFromRail = useCallback(
    (id: ID, element: HTMLElement) => latest.current.nav.toProject(id, originOf(element)),
    [latest],
  )

  const clusterState = (cluster: ClusterLayout): ClusterState =>
    focused ? (cluster === focused ? 'focused' : 'dimmed') : 'idle'
  const nodeState = (cluster: ClusterLayout): NodeState =>
    focused ? (cluster === focused ? 'open' : 'dimmed') : 'mote'

  return (
    <>
      <div
        ref={stageRef}
        className="space"
        data-view={route.view}
        data-covered={covered}
        data-receiving={receiving}
        data-intro={introPhase}
        data-arranging={arranging}
        style={cssVars({ 'handoff-delay': `${Math.round(motionMs(projectMotion.approach) * projectMotion.handoffAt)}ms` })}
      >
        <canvas ref={canvasRef} className="space__canvas" aria-hidden="true" />
        <div
          className="space__layer"
          style={cssVars({
            'caption-width': `${interaction.captionWidthPx * viewport.scale}px`,
            'work-active-scale': spaceConfig.effects.workActiveScale,
            'work-near-scale': spaceConfig.effects.workNearScale,
          })}
        >
          {layout.clusters.map((cluster) => (
            <ClusterNode
              key={cluster.category.id}
              cluster={cluster}
              state={clusterState(cluster)}
              register={registerCluster}
              onSelect={selectCluster}
            />
          ))}
          {layout.clusters.flatMap((cluster) =>
            cluster.nodes.map((placed) => {
              const isActive = cluster === focused && placed.project.id === active?.id
              return (
                <WorkNode
                  key={placed.project.id}
                  placed={placed}
                  state={nodeState(cluster)}
                  active={isActive}
                  caption={isActive && !viewport.touchUi ? (active?.caption ?? null) : null}
                  born={placed.project.id === bornProjectId}
                  away={placed.project.id === awayProjectId}
                  register={registerNode}
                  onActivate={activateNode}
                  onDeactivate={deactivateNode}
                  onPress={pressNode}
                />
              )
            }),
          )}
        </div>
        <PostEffects />
      </div>

      {arranging && <ArrangeBar touchUi={viewport.touchUi} />}
      {ready && introPhase !== 'playing' && (
        <SpaceSummary empty={categories.length === 0} visible={route.view === 'galaxy'} />
      )}
      {/* key: 다른 성단으로 옮기면 등장 애니메이션과 스크롤 위치를 새로 시작한다 */}
      {route.view === 'system' && focused && <ClusterTitle key={`title-${focusedId}`} cluster={focused} />}
      {route.view === 'system' && focused && viewport.touchUi && focused.nodes.length > 0 && (
        <ProjectRail
          key={`rail-${focusedId}`}
          items={focused.nodes}
          activeId={active?.id ?? null}
          onBrowse={browseNode}
          onOpen={openFromRail}
        />
      )}
    </>
  )
}
