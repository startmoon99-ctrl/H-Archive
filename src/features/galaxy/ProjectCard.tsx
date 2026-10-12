import { statusLabel } from '@/config/catalog'
import { MediaPreview } from '@/features/media/MediaPreview'
import type { Project } from '@/types/archive'
import { cssVars } from '@/utils/css'
import { formatDate } from '@/utils/format'
import { findCover } from '@/utils/project'
import './project-card.css'

interface ProjectCardProps {
  project: Project
  hue: number
  /** true면 Preview를 재생한다 */
  active: boolean
}

/** 프로젝트 한 장 요약. 행성 옆의 미리보기(PC)와 하단 Rail(모바일)이 함께 쓴다. */
export function ProjectCard({ project, hue, active }: ProjectCardProps) {
  return (
    <div className="project-card" data-active={active} style={cssVars({ hue })}>
      <MediaPreview asset={findCover(project)} active={active} />
      <div className="project-card__text">
        <p className="eyebrow">
          {formatDate(project.startedAt)} · {statusLabel(project.status)}
        </p>
        <h3 className="project-card__title">{project.title}</h3>
        {project.description && <p className="project-card__description">{project.description}</p>}
        <p className="project-card__meta">기록 {project.timeline.length}개</p>
      </div>
    </div>
  )
}
