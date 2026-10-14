import { memo, useEffect, useState } from 'react'
import { statusLabel } from '@/config/catalog'
import { MediaPreview } from '@/features/media/MediaPreview'
import { motionMs } from '@/motion/runtime'
import type { ID, Project } from '@/types/archive'
import { cssVars } from '@/utils/css'
import { formatDate } from '@/utils/format'
import { findCover } from '@/utils/project'
import type { PlacedNode } from '../scene/layout'
import './work-node.css'

/** mote: 전체 보기의 작은 빛 / open: 성단 안에서 펼쳐진 프레임 / dimmed: 다른 성단에 들어가 있을 때 */
export type NodeState = 'mote' | 'open' | 'dimmed'

/** 작품 옆에 뜨는 설명이 놓이는 쪽 */
export interface CaptionPlacement {
  side: 'left' | 'right'
  align: 'start' | 'center' | 'end'
}

function WorkCaption({ project, placement }: { project: Project; placement: CaptionPlacement }) {
  return (
    <div className="node__caption" data-side={placement.side} data-align={placement.align} aria-hidden="true">
      <p className="eyebrow">
        {formatDate(project.startedAt)} · {statusLabel(project.status)}
      </p>
      <p className="node__caption-title">{project.title}</p>
      {project.description && <p className="node__caption-text">{project.description}</p>}
      <p className="node__caption-meta">기록 {project.timeline.length}개</p>
    </div>
  )
}

interface WorkNodeProps {
  placed: PlacedNode
  state: NodeState
  active: boolean
  /** 주면 옆에 설명을 띄운다(마우스 환경) */
  caption: CaptionPlacement | null
  /** 방금 만들어진 작품: 등장 연출 */
  born: boolean
  /** 이미지가 상세 화면으로 건너가 있다: 프레임을 비워 둔다 */
  away: boolean
  /** 장면이 위치를 옮길 수 있게 요소를 등록한다 */
  register: (id: ID, element: HTMLElement | null) => void
  onActivate: (id: ID, element: HTMLElement) => void
  onDeactivate: () => void
  onPress: (id: ID, element: HTMLElement) => void
}

/**
 * 작품(프로젝트) 하나. 멀리서는 빛나는 점이고, 성단에 들어오면 대표 이미지가 담긴 얇은 프레임으로 펼쳐진다.
 * 위치와 크기는 장면이 매 프레임 정하고(--s), 빛 · 확대 같은 반응은 effects/node-effects.css가 정한다.
 */
export const WorkNode = memo(function WorkNode({
  placed,
  state,
  active,
  caption,
  born,
  away,
  register,
  onActivate,
  onDeactivate,
  onPress,
}: WorkNodeProps) {
  const { project, hue, width, height, index, dx, dy } = placed
  const open = state === 'open'
  // 한 번 펼쳐진 뒤에는 접히는 동안에도 이미지를 유지한다
  const [unfolded, setUnfolded] = useState(open)
  useEffect(() => {
    if (open) setUnfolded(true)
  }, [open])

  // 상세 화면에서 이미지가 돌아와 다시 자리를 채운 순간을 잠시 표시한다(내려앉는 연출: effects/node-effects.css)
  const [wasAway, setWasAway] = useState(away)
  const [landed, setLanded] = useState(false)
  if (away !== wasAway) {
    setWasAway(away)
    if (!away) setLanded(true)
  }
  useEffect(() => {
    if (!landed) return
    const timer = window.setTimeout(() => setLanded(false), motionMs('slow'))
    return () => window.clearTimeout(timer)
  }, [landed])

  const cover = findCover(project)

  return (
    <div
      ref={(element) => register(project.id, element)}
      className="node"
      data-state={state}
      data-active={active}
      data-born={born}
      data-away={away}
      data-landed={landed}
      aria-hidden={!open}
      style={cssVars({ hue, w: width, h: height, i: index, dx, dy })}
    >
      <button
        type="button"
        className="node__hit"
        tabIndex={open ? 0 : -1}
        aria-label={`${project.title}, 기록 ${project.timeline.length}개`}
        onClick={(event) => onPress(project.id, event.currentTarget)}
        onPointerEnter={(event) => event.pointerType === 'mouse' && onActivate(project.id, event.currentTarget)}
        onPointerLeave={(event) => event.pointerType === 'mouse' && onDeactivate()}
        // 키보드로 옮겨 온 초점만 선택으로 본다(클릭 · 탭의 초점은 제외)
        onFocus={(event) => event.currentTarget.matches(':focus-visible') && onActivate(project.id, event.currentTarget)}
        onBlur={onDeactivate}
      >
        <span className="node__point" />
        <span className="node__frame">
          {unfolded &&
            (cover ? (
              <MediaPreview asset={cover} active={active} />
            ) : (
              <span className="node__mono">{[...project.title][0]}</span>
            ))}
        </span>
      </button>
      <span className="node__label">{project.title}</span>
      {caption && <WorkCaption project={project} placement={caption} />}
    </div>
  )
})
