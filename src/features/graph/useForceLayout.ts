import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type ForceLink,
  type Simulation,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force';
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { GRAPH } from '@/config/graph';
import { useLatest } from '@/hooks/useLatest';
import type { GraphEdgeData, GraphNodeData } from './graphModel';

export interface LayoutNode extends SimulationNodeDatum {
  id: string;
  r: number;
}

export interface LayoutLink extends SimulationLinkDatum<LayoutNode> {
  id: string;
  source: LayoutNode;
  target: LayoutNode;
}

export type TickHandler = (nodes: ReadonlyMap<string, LayoutNode>, links: readonly LayoutLink[]) => void;

interface Point {
  x: number;
  y: number;
}

// 화면을 오가거나 Focus Mode 를 켜고 꺼도 노드가 제자리로 돌아오도록 위치를 기억한다
const positionCache = new Map<string, Point>();

const GOLDEN_ANGLE = 2.399963;
const SPAWN_DISTANCE = 36;

/** 새 노드는 연결된 이웃 근처, 이웃이 없으면 중심 주변에 놓는다 */
function spawnPosition(order: number, anchor?: Point): Point {
  const angle = order * GOLDEN_ANGLE;
  const distance = anchor ? SPAWN_DISTANCE : SPAWN_DISTANCE * Math.sqrt(order + 1);
  return {
    x: (anchor?.x ?? 0) + Math.cos(angle) * distance,
    y: (anchor?.y ?? 0) + Math.sin(angle) * distance,
  };
}

function createSimulation(onTick: () => void) {
  const { force } = GRAPH;
  return forceSimulation<LayoutNode, LayoutLink>()
    .force('link', forceLink<LayoutNode, LayoutLink>().distance(force.linkDistance))
    .force('charge', forceManyBody<LayoutNode>().strength(force.charge).distanceMax(force.chargeDistanceMax))
    .force('x', forceX<LayoutNode>(0).strength(force.gravity))
    .force('y', forceY<LayoutNode>(0).strength(force.gravity))
    .force(
      'collide',
      forceCollide<LayoutNode>((node) => node.r + force.collidePadding),
    )
    .on('tick', onTick)
    .stop();
}

/**
 * force simulation 을 관리한다.
 * 좌표는 React state 로 두지 않고 매 tick 마다 onTick 으로 넘겨 DOM 에 직접 쓴다.
 */
export function useForceLayout(nodes: GraphNodeData[], edges: GraphEdgeData[], onTick: TickHandler) {
  const simulationRef = useRef<Simulation<LayoutNode, LayoutLink> | null>(null);
  const nodesRef = useRef(new Map<string, LayoutNode>());
  const linksRef = useRef<LayoutLink[]>([]);
  const signatureRef = useRef('');
  const onTickRef = useLatest(onTick);

  useLayoutEffect(() => {
    const previous = nodesRef.current;
    for (const node of previous.values()) positionCache.set(node.id, { x: node.x ?? 0, y: node.y ?? 0 });

    const neighborsOf = new Map<string, string[]>();
    for (const edge of edges) {
      neighborsOf.set(edge.source, [...(neighborsOf.get(edge.source) ?? []), edge.target]);
      neighborsOf.set(edge.target, [...(neighborsOf.get(edge.target) ?? []), edge.source]);
    }

    const next = new Map<string, LayoutNode>();
    let hasKnownPosition = false;
    nodes.forEach((node, order) => {
      const existing = previous.get(node.id);
      if (existing) {
        existing.r = node.radius;
        next.set(node.id, existing);
        hasKnownPosition = true;
        return;
      }
      const cached = positionCache.get(node.id);
      if (cached) hasKnownPosition = true;
      const anchorId = neighborsOf.get(node.id)?.find((id) => positionCache.has(id));
      const position = cached ?? spawnPosition(order, anchorId ? positionCache.get(anchorId) : undefined);
      next.set(node.id, { id: node.id, r: node.radius, ...position });
    });

    const links: LayoutLink[] = edges.map((edge) => ({
      id: edge.id,
      source: next.get(edge.source)!,
      target: next.get(edge.target)!,
    }));
    nodesRef.current = next;
    linksRef.current = links;

    const created = !simulationRef.current;
    const simulation = (simulationRef.current ??= createSimulation(() =>
      onTickRef.current(nodesRef.current, linksRef.current),
    ));
    simulation.nodes([...next.values()]);
    simulation.force<ForceLink<LayoutNode, LayoutLink>>('link')?.links(links);

    // 내용만 바뀐 경우(제목 수정 등)에는 레이아웃을 다시 흔들지 않는다
    const signature = `${nodes.map((node) => node.id).join()}|${edges.map((edge) => edge.id).join()}`;
    if (created || signature !== signatureRef.current) {
      signatureRef.current = signature;
      if (hasKnownPosition) {
        simulation.alpha(GRAPH.force.reheatAlpha).restart();
      } else {
        // 첫 화면은 미리 계산해서 안정된 배치로 시작한다
        simulation.alpha(1).tick(GRAPH.force.warmupTicks);
        simulation.alpha(0.05).restart();
      }
    }

    onTickRef.current(next, links);
  }, [nodes, edges, onTickRef]);

  useEffect(
    () => () => {
      for (const node of nodesRef.current.values()) positionCache.set(node.id, { x: node.x ?? 0, y: node.y ?? 0 });
      simulationRef.current?.stop();
      simulationRef.current = null;
    },
    [],
  );

  return useMemo(
    () => ({
      nodes: nodesRef,
      startDrag() {
        simulationRef.current?.alphaTarget(GRAPH.force.dragAlphaTarget).restart();
      },
      drag(id: string, x: number, y: number) {
        const node = nodesRef.current.get(id);
        if (!node) return;
        node.fx = x;
        node.fy = y;
      },
      endDrag(id: string) {
        const node = nodesRef.current.get(id);
        if (node) {
          node.fx = null;
          node.fy = null;
        }
        simulationRef.current?.alphaTarget(0);
      },
    }),
    [],
  );
}

export type ForceLayout = ReturnType<typeof useForceLayout>;
