import { useRef, type ReactNode } from 'react'
import { ExternalLink, Pencil, Plus } from 'lucide-react'
import { useArchiveNav } from '@/app/useArchiveRoute'
import { Button } from '@/components/Button'
import { statusLabel } from '@/config/catalog'
import { projectMotion } from '@/config/motion'
import { MediaPreview } from '@/features/media/MediaPreview'
import { useScrollLinked, type ScrollMeasure } from '@/hooks/useScrollLinked'
import { useTilt } from '@/motion/usePointerReactive'
import { useUiStore } from '@/store/uiStore'
import type { Category, Project } from '@/types/archive'
import { cssVars } from '@/utils/css'
import { formatDate } from '@/utils/format'
import { allMedia, findCover, isVisual, lastActivity } from '@/utils/project'
import './project-hero.css'

const scrolledPx: ScrollMeasure = (_rect, _viewportHeight, scrollTop) => scrollTop

interface ProjectHeroProps {
  project: Project
  category: Category
}

/** 프로젝트 상세의 첫 화면: 무엇을 만들었는지 한눈에 */
export function ProjectHero({ project, category }: ProjectHeroProps) {
  const nav = useArchiveNav()
  const openDialog = useUiStore((state) => state.openDialog)
  const coverRef = useRef<HTMLButtonElement>(null)
  useTilt(coverRef)
  useScrollLinked(coverRef, scrolledPx)

  const cover = findCover(project)
  const visuals = allMedia(project).filter(isVisual)
  const started = formatDate(project.startedAt)
  const latest = formatDate(lastActivity(project))

  const lines: ReactNode[] = [
    <p className="hero__eyebrow eyebrow">
      <button type="button" className="hero__category" onClick={() => nav.toSystem(category.id)}>
        {category.name}
      </button>
      <span>{statusLabel(project.status)}</span>
    </p>,
    <h1 className="hero__title">{project.title}</h1>,
    project.description && <p className="hero__description">{project.description}</p>,
    <p className="hero__meta">
      {started === latest ? started : `${started} — ${latest}`} · 기록 {project.timeline.length}개
    </p>,
    project.tags.length > 0 && (
      <ul className="hero__tags" aria-label="태그">
        {project.tags.map((tag) => (
          <li key={tag} className="chip">
            #{tag}
          </li>
        ))}
      </ul>
    ),
    project.links.length > 0 && (
      <ul className="hero__links">
        {project.links.map((link) => (
          <li key={link.id}>
            <a className="text-link" href={link.url} target="_blank" rel="noreferrer">
              {link.label}
              <ExternalLink aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    ),
    <div className="hero__actions">
      <Button icon={Plus} variant="primary" magnetic onClick={() => openDialog({ type: 'entry', projectId: project.id })}>
        기록 추가
      </Button>
      <Button icon={Pencil} variant="quiet" onClick={() => openDialog({ type: 'project', projectId: project.id })}>
        편집
      </Button>
    </div>,
  ].filter(Boolean)

  return (
    <header className="hero">
      <div className="hero__text">
        {lines.map((line, index) => (
          <div key={index} className="enter" style={cssVars({ 'enter-index': index })}>
            {line}
          </div>
        ))}
      </div>

      <button
        ref={coverRef}
        type="button"
        className="hero__cover enter"
        style={cssVars({ 'enter-index': 1, parallax: projectMotion.heroParallax })}
        disabled={!cover}
        aria-label="대표 미디어 크게 보기"
        onClick={() => cover && openDialog({ type: 'viewer', items: visuals, index: Math.max(visuals.indexOf(cover), 0) })}
      >
        <MediaPreview asset={cover} active detail="display" />
      </button>
    </header>
  )
}
