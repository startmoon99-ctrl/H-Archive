import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useArchiveNav, useArchiveRoute } from '@/app/useArchiveRoute'
import { galaxyConfig } from '@/config/galaxy'
import { useLatest } from '@/hooks/useLatest'
import { useViewport } from '@/hooks/useViewport'
import { motionMs } from '@/motion/runtime'
import { useArchiveStore } from '@/store/archiveStore'
import { useUiStore, type TravelOrigin } from '@/store/uiStore'
import type { ID } from '@/types/archive'
import type { Point } from '@/types/ui'
import { cssVars } from '@/utils/css'
import { cameraState, screenToWorld, type CameraTarget } from './cameraState'
import { GalaxySummary } from './GalaxySummary'
import { buildGalaxyLayout, type SystemLayout } from './layout'
import type { PeekPlacement } from './ProjectObject'
import { ProjectRail } from './ProjectRail'
import { Starfield } from './Starfield'
import { StarSystem, type SystemState } from './StarSystem'
import { SystemTitle } from './SystemTitle'
import { useGalaxyCamera } from './useGalaxyCamera'
import './galaxy.css'

const { camera, proximity, planet } = galaxyConfig

interface ActiveProject {
  id: ID
  peek: PeekPlacement
}

function centerOf(element: HTMLElement): Point {
  const rect = element.getBoundingClientRect()
  return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
}

/** 프로젝트 화면이 은하를 완전히 덮은 뒤에 true가 된다. 그동안 은하는 그리기를 멈춘다. */
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
 * 은하 화면. 주소(은하 · 항성계 · 프로젝트)에 맞춰 카메라의 목표를 정하고
 * 항성계와 프로젝트를 배치한다. 항상 떠 있으며 프로젝트 화면은 이 위에 겹쳐 열린다.
 */
export function Galaxy() {
  const route = useArchiveRoute()
  const nav = useArchiveNav()
  const viewport = useViewport()
  const categories = useArchiveStore((state) => state.categories)
  const projects = useArchiveStore((state) => state.projects)
  const ready = useArchiveStore((state) => state.status === 'ready')
  const introPhase = useUiStore((state) => state.introPhase)
  const introRevealMs = useUiStore((state) => state.introRevealMs)
  const travelOrigin = useUiStore((state) => state.travelOrigin)
  const bornProjectId = useUiStore((state) => state.bornProjectId)
  const setBornProject = useUiStore((state) => state.setBornProject)
  const receiving = useUiStore((state) => state.isDraggingFiles)

  const stageRef = useRef<HTMLDivElement>(null)
  const worldRef = useRef<HTMLDivElement>(null)
  const tiltRef = useRef<HTMLDivElement>(null)
  const [nearId, setNearId] = useState<ID | null>(null)
  const [active, setActive] = useState<ActiveProject | null>(null)

  const layout = useMemo(() => buildGalaxyLayout(categories, projects, viewport), [categories, projects, viewport])
  const focused: SystemLayout | null =
    layout.systems.find((system) => system.category.id === route.categoryId) ?? null
  const focusedId = focused?.category.id ?? null
  const covered = useCovered(route.view === 'project')

  const target = useMemo<CameraTarget>(() => {
    if (introPhase === 'playing') {
      return { ...layout.overview, zoom: layout.overview.zoom * camera.introZoomFactor }
    }
    if (!focused) return layout.overview
    if (route.view === 'project') {
      const point = travelOrigin?.world ?? focused.focus
      return { x: point.x, y: point.y, zoom: focused.focus.zoom * camera.projectZoomFactor }
    }
    return focused.focus
  }, [introPhase, layout, focused, route.view, travelOrigin])

  const zoomRange = useMemo(
    () =>
      focused
        ? { min: focused.focus.zoom * camera.exitFactor * 0.8, max: focused.focus.zoom * 2 }
        : { min: layout.overview.zoom * 0.6, max: layout.overview.zoom * camera.enterFactor * 1.5 },
    [focused, layout],
  )

  useGalaxyCamera({
    stageRef,
    worldRef,
    tiltRef,
    viewport,
    target,
    travelMs: introPhase === 'playing' ? 0 : introPhase === 'revealing' ? introRevealMs : motionMs('travel'),
    zoomRange,
    bounds: layout.bounds,
    active: !covered,
    // 은하에서 충분히 확대하면 가까운 항성계로 들어가고, 항성계에서 충분히 축소하면 은하로 나온다
    onZoomSettled: (zoom) => {
      if (route.view === 'galaxy' && zoom >= layout.overview.zoom * camera.enterFactor) {
        const distanceTo = (system: SystemLayout) => Math.hypot(system.x - cameraState.x, system.y - cameraState.y)
        const nearest = [...layout.systems].sort((a, b) => distanceTo(a) - distanceTo(b))[0]
        if (nearest) nav.toSystem(nearest.category.id)
      } else if (route.view === 'system' && focused && zoom <= focused.focus.zoom * camera.exitFactor) {
        nav.toGalaxy()
      }
    },
    onHover: (world) => {
      if (!world || route.view !== 'galaxy') {
        setNearId(null)
        return
      }
      const reach = (system: SystemLayout) =>
        system.outerRadius * proximity.radiusFactor + proximity.extraPx / cameraState.zoom
      const hit = layout.systems.find((system) => Math.hypot(system.x - world.x, system.y - world.y) < reach(system))
      setNearId(hit?.category.id ?? null)
    },
  })

  // 다른 항성계로 옮기면 선택을 푼다
  useEffect(() => setActive(null), [focusedId])

  useEffect(() => {
    if (!bornProjectId) return
    const timer = window.setTimeout(() => setBornProject(null), motionMs('travel') + motionMs('cinematic'))
    return () => window.clearTimeout(timer)
  }, [bornProjectId, setBornProject])

  // StarSystem이 memo로 남도록 핸들러는 고정하고 최신 값은 ref로 읽는다
  const latest = useLatest({ viewport, activeId: active?.id ?? null, nav })

  const originOf = useCallback(
    (element: HTMLElement): TravelOrigin => {
      const screen = centerOf(element)
      return { screen, world: screenToWorld(screen, latest.current.viewport) }
    },
    [latest],
  )

  const activateProject = useCallback(
    (id: ID, element: HTMLElement) => {
      const { width, height, scale } = latest.current.viewport
      const center = centerOf(element)
      // 카드는 항성을 가리지 않게 바깥쪽에 띄우고, 화면 밖으로 나갈 때만 안쪽으로 돌린다
      const needed = (planet.peekWidth + planet.maxSize + planet.peekMargin) * scale
      const onLeftHalf = center.x < width / 2
      const fitsOutward = onLeftHalf ? center.x > needed : width - center.x > needed
      setActive({
        id,
        peek: {
          side: onLeftHalf === fitsOutward ? 'left' : 'right',
          align: center.y < height / 3 ? 'start' : center.y > (height * 2) / 3 ? 'end' : 'center',
        },
      })
    },
    [latest],
  )

  const deactivateProject = useCallback(() => {
    // 터치 환경에서는 다른 것을 고를 때까지 선택을 유지한다
    if (!latest.current.viewport.touchUi) setActive(null)
  }, [latest])

  const pressProject = useCallback(
    (id: ID, element: HTMLElement) => {
      const { viewport: current, activeId, nav: navigation } = latest.current
      // 터치: 첫 번째 탭은 선택, 선택된 행성을 다시 누르면 연다
      if (current.touchUi && activeId !== id) activateProject(id, element)
      else navigation.toProject(id, originOf(element))
    },
    [latest, activateProject, originOf],
  )

  const browseProject = useCallback((id: ID) => setActive({ id, peek: { side: 'right', align: 'center' } }), [])
  const openFromRail = useCallback(
    (id: ID, element: HTMLElement) => latest.current.nav.toProject(id, originOf(element)),
    [latest, originOf],
  )

  const stateOf = (system: SystemLayout): SystemState => {
    if (focused) return system === focused ? 'focused' : 'dimmed'
    return system.category.id === nearId ? 'near' : 'idle'
  }

  return (
    <>
      <div
        ref={stageRef}
        className="galaxy"
        data-view={route.view}
        data-covered={covered}
        data-receiving={receiving}
        data-intro={introPhase}
      >
        <Starfield paused={covered} />
        <div ref={tiltRef} className="galaxy__tilt">
          <div
            ref={worldRef}
            className="galaxy__world"
            style={cssVars({
              'overview-zoom': layout.overview.zoom,
              'mote-scale': planet.moteScale,
              'peek-width': `${planet.peekWidth * viewport.scale}px`,
            })}
          >
            <div className="galaxy__core" aria-hidden="true" />
            {layout.systems.map((system) => {
              const isFocused = system === focused
              return (
                <StarSystem
                  key={system.category.id}
                  system={system}
                  state={stateOf(system)}
                  activeProjectId={isFocused ? (active?.id ?? null) : null}
                  peek={isFocused && !viewport.touchUi ? (active?.peek ?? null) : null}
                  bornProjectId={bornProjectId}
                  onSelect={nav.toSystem}
                  onProjectActivate={activateProject}
                  onProjectDeactivate={deactivateProject}
                  onProjectPress={pressProject}
                />
              )
            })}
          </div>
        </div>
      </div>

      {ready && introPhase !== 'playing' && (
        <GalaxySummary categories={categories} projects={projects} visible={route.view === 'galaxy'} />
      )}
      {/* key: 다른 항성계로 옮기면 등장 애니메이션과 스크롤 위치를 새로 시작한다 */}
      {route.view === 'system' && focused && <SystemTitle key={`title-${focused.category.id}`} system={focused} />}
      {route.view === 'system' && focused && viewport.touchUi && focused.projectCount > 0 && (
        <ProjectRail
          key={`rail-${focused.category.id}`}
          items={focused.rings.flatMap((ring) => ring.items)}
          activeId={active?.id ?? null}
          onBrowse={browseProject}
          onOpen={openFromRail}
        />
      )}
    </>
  )
}
