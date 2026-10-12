import { memo, useLayoutEffect, useRef } from 'react'
import type { ID } from '@/types/archive'
import { cssVars } from '@/utils/css'
import type { SystemLayout } from './layout'
import { ProjectObject, type PeekPlacement } from './ProjectObject'
import './star-system.css'

/**
 * idle: 은하 전체를 볼 때 / near: 마우스가 다가왔을 때(이름이 나타난다)
 * focused: 이 항성계 안에 들어왔을 때 / dimmed: 다른 항성계에 들어가 있을 때
 */
export type SystemState = 'idle' | 'near' | 'focused' | 'dimmed'

interface StarSystemProps {
  system: SystemLayout
  state: SystemState
  activeProjectId: ID | null
  peek: PeekPlacement | null
  bornProjectId: ID | null
  onSelect: (categoryId: ID) => void
  onProjectActivate: (id: ID, element: HTMLElement) => void
  onProjectDeactivate: () => void
  onProjectPress: (id: ID, element: HTMLElement) => void
}

/** 카테고리 하나 = 항성과 그 주위를 도는 프로젝트들 */
export const StarSystem = memo(function StarSystem({
  system,
  state,
  activeProjectId,
  peek,
  bornProjectId,
  onSelect,
  onProjectActivate,
  onProjectDeactivate,
  onProjectPress,
}: StarSystemProps) {
  const { category, rings, outerRadius, projectCount } = system
  const focused = state === 'focused'
  const rootRef = useRef<HTMLDivElement>(null)

  // 궤도와 그 안의 내용은 서로 반대로 도는 두 애니메이션이다. 나중에 추가된 프로젝트는
  // 애니메이션이 늦게 시작해 기울어 보이므로, 배치가 바뀔 때마다 모두 같은 시각으로 맞춘다.
  useLayoutEffect(() => {
    const animations = [...(rootRef.current?.querySelectorAll('.orbit, .orbit__upright') ?? [])].flatMap(
      (element) => element.getAnimations(),
    )
    const clock = Math.max(0, ...animations.map((animation) => Number(animation.currentTime) || 0))
    for (const animation of animations) animation.currentTime = clock
  }, [rings])

  return (
    <div
      ref={rootRef}
      className="system"
      data-state={state}
      data-paused={activeProjectId !== null}
      style={cssVars({
        x: system.x,
        y: system.y,
        hue: category.hue,
        outer: outerRadius,
        'star-size': system.starSize,
        'focus-zoom': system.focus.zoom,
      })}
    >
      <svg className="system__rings" aria-hidden="true">
        {rings.map((ring) => (
          <circle key={ring.radius} className="system__ring" r={ring.radius} />
        ))}
      </svg>

      <button
        type="button"
        className="system__star"
        tabIndex={focused ? -1 : 0}
        aria-label={`${category.name} 항성계, 창작물 ${projectCount}개`}
        onClick={() => onSelect(category.id)}
      >
        <span className="system__glow" />
        <span className="system__core" />
      </button>

      {rings.map((ring) => (
        <div
          key={ring.radius}
          className="orbit"
          data-reverse={ring.reverse}
          style={cssVars({ 'orbit-duration': `${ring.duration}s`, radius: `${ring.radius}px` })}
        >
          {ring.items.map((placed) => {
            const active = focused && placed.project.id === activeProjectId
            return (
              <div key={placed.project.id} className="orbit__slot" style={cssVars({ angle: `${placed.angle}deg` })}>
                <div className="orbit__upright">
                  <ProjectObject
                    placed={placed}
                    interactive={focused}
                    active={active}
                    peek={active ? peek : null}
                    born={placed.project.id === bornProjectId}
                    onActivate={onProjectActivate}
                    onDeactivate={onProjectDeactivate}
                    onPress={onProjectPress}
                  />
                </div>
              </div>
            )
          })}
        </div>
      ))}

      <p className="system__label" aria-hidden="true">
        <span className="system__name">{category.name}</span>
        <span className="system__count">{projectCount}</span>
      </p>
    </div>
  )
})
