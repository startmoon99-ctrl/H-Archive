import { memo } from 'react'
import type { ID } from '@/types/archive'
import { cssVars } from '@/utils/css'
import type { ClusterLayout } from '../scene/layout'
import './cluster-node.css'

/**
 * idle: 전체 보기 / focused: 이 성단 안에 들어와 있음 / dimmed: 다른 성단에 들어가 있음
 * 커서와의 가까움은 상태가 아니라 --near(0 ~ 1)로 매 프레임 전달된다(scene/sceneUpdater).
 */
export type ClusterState = 'idle' | 'focused' | 'dimmed'

interface ClusterNodeProps {
  cluster: ClusterLayout
  state: ClusterState
  /** 장면이 위치를 옮길 수 있게 요소를 등록한다 */
  register: (id: ID, element: HTMLElement | null) => void
  onSelect: (categoryId: ID) => void
}

/** 카테고리 하나 = 빛의 중심점. 주변의 입자 무리는 environment가, 작품은 WorkNode가 그린다. */
export const ClusterNode = memo(function ClusterNode({ cluster, state, register, onSelect }: ClusterNodeProps) {
  const { category, nodes, radius } = cluster
  return (
    <div
      ref={(element) => register(category.id, element)}
      className="cluster"
      data-state={state}
      style={cssVars({ hue: category.hue, r: radius })}
    >
      <button
        type="button"
        className="cluster__hit"
        tabIndex={state === 'focused' ? -1 : 0}
        aria-label={`${category.name} 성단, 창작물 ${nodes.length}개`}
        onClick={() => onSelect(category.id)}
      />
      <span className="cluster__halo" />
      <span className="cluster__ring" />
      <span className="cluster__core" />
      <p className="cluster__label" aria-hidden="true">
        <span className="cluster__name">{category.name}</span>
        <span className="cluster__count">{nodes.length} Works</span>
      </p>
    </div>
  )
})
