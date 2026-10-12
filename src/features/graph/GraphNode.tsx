import { memo, useCallback, type CSSProperties } from 'react';
import { LIMITS } from '@/config/app';
import { GRAPH } from '@/config/graph';
import { getItemType, typeColorVar } from '@/config/itemTypes';
import { cx } from '@/utils/cx';
import { truncate } from '@/utils/text';
import type { GraphNodeData } from './graphModel';

const LABEL_GAP = 15;
const HALO_PADDING = 6;

interface GraphNodeProps {
  node: GraphNodeData;
  selected: boolean;
  /** hover / 선택된 노드와 그 이웃 — 라벨을 항상 보여 준다 */
  emphasized: boolean;
  dimmed: boolean;
  register(id: string, element: SVGGElement | null): void;
  onHover(id: string | null): void;
  onActivate(id: string): void;
}

/** 노드 하나. 위치(transform)는 GraphView 가 tick 마다 직접 갱신하므로 여기서는 모양만 그린다. */
export const GraphNode = memo(function GraphNode({
  node,
  selected,
  emphasized,
  dimmed,
  register,
  onHover,
  onActivate,
}: GraphNodeProps) {
  const { id, item, radius } = node;
  const type = getItemType(item.type);
  const Icon = type.icon;
  const iconSize = radius * GRAPH.node.iconScale;
  const ref = useCallback((element: SVGGElement | null) => register(id, element), [id, register]);

  return (
    <g
      ref={ref}
      data-node-id={id}
      className={cx('graph-node', selected && 'is-selected', emphasized && 'is-emphasized', dimmed && 'is-dimmed')}
      style={{ '--node-color': typeColorVar(item.type), '--node-hit': `${radius + HALO_PADDING}px` } as CSSProperties}
      role="button"
      tabIndex={0}
      aria-label={`${type.label}: ${item.title}`}
      aria-pressed={selected}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') onHover(id);
      }}
      onPointerLeave={() => onHover(null)}
      onKeyDown={(event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        onActivate(id);
      }}
    >
      {/* 실제 반지름은 graph.css 가 배율에 맞춰 계산한다. r 속성은 CSS r 을 지원하지 않는 브라우저용 기본값 */}
      <circle className="graph-node__hit" r={Math.max(radius + HALO_PADDING, GRAPH.node.minHitRadius)} />
      <circle className="graph-node__halo" r={radius + HALO_PADDING} />
      <circle className="graph-node__dot" r={radius} />
      <Icon className="graph-node__icon" x={-iconSize / 2} y={-iconSize / 2} size={iconSize} strokeWidth={2.2} aria-hidden />
      <text className="graph-node__label" y={radius + LABEL_GAP}>
        {emphasized || selected ? item.title : truncate(item.title, LIMITS.graphLabelLength)}
      </text>
    </g>
  );
});
