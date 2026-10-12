import { useCallback, useMemo } from 'react'
import { useMatch, useNavigate } from 'react-router'
import { ROUTE_PATTERNS, routes } from '@/config/routes'
import { useArchiveStore } from '@/store/archiveStore'
import { useUiStore, type TravelOrigin } from '@/store/uiStore'
import type { ID } from '@/types/archive'

/** galaxy: 은하 전체 / system: 항성계 안 / project: 프로젝트 상세 */
export type ArchiveView = 'galaxy' | 'system' | 'project'

export interface ArchiveRoute {
  view: ArchiveView
  /** 지금 머무는 항성계. 프로젝트 화면에서는 그 프로젝트가 속한 항성계다. */
  categoryId: ID | null
  projectId: ID | null
}

/** 주소에서 지금 어디에 있는지를 읽는다. 화면 상태의 단일 출처는 주소다. */
export function useArchiveRoute(): ArchiveRoute {
  const systemMatch = useMatch(ROUTE_PATTERNS.system)
  const projectMatch = useMatch(ROUTE_PATTERNS.project)
  const projectId = projectMatch?.params.projectId ?? null
  const projectCategoryId = useArchiveStore((state) =>
    projectId ? (state.projects.find((project) => project.id === projectId)?.categoryId ?? null) : null,
  )
  const systemId = systemMatch?.params.categoryId ?? null

  return useMemo<ArchiveRoute>(() => {
    if (projectId) return { view: 'project', categoryId: projectCategoryId, projectId }
    if (systemId) return { view: 'system', categoryId: systemId, projectId: null }
    return { view: 'galaxy', categoryId: null, projectId: null }
  }, [projectId, projectCategoryId, systemId])
}

export function useArchiveNav() {
  const navigate = useNavigate()
  const route = useArchiveRoute()
  const setTravelOrigin = useUiStore((state) => state.setTravelOrigin)

  const toGalaxy = useCallback(() => navigate(routes.galaxy()), [navigate])
  const toSystem = useCallback((categoryId: ID) => navigate(routes.system(categoryId)), [navigate])
  /** origin을 주면 그 지점에서 화면이 열리고 카메라가 그곳으로 다가간다. */
  const toProject = useCallback(
    (projectId: ID, origin: TravelOrigin | null = null) => {
      setTravelOrigin(origin)
      navigate(routes.project(projectId))
    },
    [navigate, setTravelOrigin],
  )
  /** 한 단계 위로: 프로젝트 → 항성계 → 은하 */
  const back = useCallback(() => {
    if (route.view === 'project' && route.categoryId) navigate(routes.system(route.categoryId))
    else navigate(routes.galaxy())
  }, [navigate, route.view, route.categoryId])

  return { toGalaxy, toSystem, toProject, back }
}
