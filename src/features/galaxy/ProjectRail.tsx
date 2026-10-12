import { useEffect, useRef } from 'react'
import { useLatest } from '@/hooks/useLatest'
import type { ID } from '@/types/archive'
import type { PlacedProject } from './layout'
import { ProjectCard } from './ProjectCard'
import './project-rail.css'

/** 행성을 눌러 Rail이 스스로 움직이는 동안에는 스크롤 위치로 선택을 바꾸지 않는다 */
const PROGRAMMATIC_SCROLL_MS = 700
const CENTERED_RATIO = 0.6

interface ProjectRailProps {
  items: PlacedProject[]
  activeId: ID | null
  /** Rail을 넘겨서 가운데에 온 카드 */
  onBrowse: (id: ID) => void
  onOpen: (id: ID, element: HTMLElement) => void
}

/**
 * 모바일의 프로젝트 탐색: 좌우로 넘기는 카드 줄.
 * 가운데 카드가 은하에서 선택된 행성과 같아지고, 행성을 누르면 그 카드로 넘어간다.
 */
export function ProjectRail({ items, activeId, onBrowse, onOpen }: ProjectRailProps) {
  const railRef = useRef<HTMLDivElement>(null)
  const ignoreUntil = useRef(0)
  /** 스크롤로 선택된 카드. 같은 카드로 다시 스크롤하지 않기 위해 기억한다. */
  const browsedId = useRef<ID | null>(null)
  const latestOnBrowse = useLatest(onBrowse)

  useEffect(() => {
    const rail = railRef.current
    if (!rail) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (performance.now() < ignoreUntil.current) return
        const centered = entries.find((entry) => entry.isIntersecting)
        const id = (centered?.target as HTMLElement | undefined)?.dataset.projectId
        if (!id) return
        browsedId.current = id
        latestOnBrowse.current(id)
      },
      { root: rail, threshold: CENTERED_RATIO },
    )
    for (const card of rail.children) observer.observe(card)
    return () => observer.disconnect()
  }, [items, latestOnBrowse])

  useEffect(() => {
    if (!activeId || activeId === browsedId.current) return
    const card = railRef.current?.querySelector<HTMLElement>(`[data-project-id="${CSS.escape(activeId)}"]`)
    if (!card) return
    ignoreUntil.current = performance.now() + PROGRAMMATIC_SCROLL_MS
    browsedId.current = activeId
    card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
  }, [activeId])

  return (
    <div ref={railRef} className="rail" role="group" aria-label="이 항성계의 창작물">
      {items.map(({ project, hue }) => (
        <button
          key={project.id}
          type="button"
          className="rail__item"
          aria-label={`${project.title} 열기`}
          data-project-id={project.id}
          onClick={(event) => onOpen(project.id, event.currentTarget)}
        >
          <ProjectCard project={project} hue={hue} active={project.id === activeId} />
        </button>
      ))}
    </div>
  )
}
