import { memo } from 'react'
import { useMediaUrl } from '@/features/media/useMediaUrl'
import type { ID } from '@/types/archive'
import { cssVars } from '@/utils/css'
import { findCover } from '@/utils/project'
import type { PlacedProject } from './layout'
import { ProjectCard } from './ProjectCard'
import './planet.css'

/** 미리보기 카드가 행성의 어느 쪽에 놓이는지 */
export interface PeekPlacement {
  side: 'left' | 'right'
  align: 'start' | 'center' | 'end'
}

interface ProjectObjectProps {
  placed: PlacedProject
  /** 항성계 안에 들어와 있어 선택할 수 있는가. 아니면 작은 점으로만 보인다. */
  interactive: boolean
  active: boolean
  /** 주면 행성 옆에 미리보기 카드를 띄운다(마우스 환경) */
  peek: PeekPlacement | null
  /** 방금 만들어진 프로젝트: 탄생 애니메이션 */
  born: boolean
  onActivate: (id: ID, element: HTMLElement) => void
  onDeactivate: () => void
  onPress: (id: ID, element: HTMLElement) => void
}

/** 은하 안의 프로젝트 하나. 대표 이미지가 행성의 표면이 된다. */
export const ProjectObject = memo(function ProjectObject({
  placed,
  interactive,
  active,
  peek,
  born,
  onActivate,
  onDeactivate,
  onPress,
}: ProjectObjectProps) {
  const { project, hue, size, index, moons } = placed
  // 표면 이미지는 항성계에 들어왔을 때만 불러온다
  const textureUrl = useMediaUrl(interactive ? findCover(project)?.thumbnail : undefined)

  return (
    <div
      className="planet-anchor"
      data-active={active}
      data-born={born}
      aria-hidden={!interactive}
      style={cssVars({ hue, size: `${size}px`, i: index })}
    >
      <button
        type="button"
        className="planet"
        tabIndex={interactive ? 0 : -1}
        aria-label={`${project.title}, 기록 ${project.timeline.length}개`}
        onClick={(event) => onPress(project.id, event.currentTarget)}
        onPointerEnter={(event) => event.pointerType === 'mouse' && onActivate(project.id, event.currentTarget)}
        onPointerLeave={(event) => event.pointerType === 'mouse' && onDeactivate()}
        // 키보드로 옮겨 온 초점만 선택으로 본다(클릭 · 탭의 초점은 제외)
        onFocus={(event) => event.currentTarget.matches(':focus-visible') && onActivate(project.id, event.currentTarget)}
        onBlur={onDeactivate}
      >
        <span className="planet__body">
          {textureUrl && <img className="planet__texture" src={textureUrl} alt="" draggable={false} />}
        </span>
        {interactive && moons > 0 && (
          <span className="planet__moons" aria-hidden="true">
            {Array.from({ length: moons }, (_, moon) => (
              <span key={moon} className="planet__moon" style={cssVars({ turn: moon / moons })} />
            ))}
          </span>
        )}
      </button>
      <span className="planet__label">{project.title}</span>
      {peek && (
        <div className="planet__peek" data-side={peek.side} data-align={peek.align} aria-hidden="true">
          <ProjectCard project={project} hue={hue} active />
        </div>
      )}
    </div>
  )
})
