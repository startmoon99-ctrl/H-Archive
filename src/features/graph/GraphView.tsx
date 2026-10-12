import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type Ref,
} from 'react';
import { GRAPH } from '@/config/graph';
import type { ItemType } from '@/config/itemTypes';
import { useLatest } from '@/hooks/useLatest';
import type { ArchiveItem } from '@/types/archive';
import { cx } from '@/utils/cx';
import type { LinkIndex } from '@/utils/links';
import { buildGraphModel } from './graphModel';
import { GraphNode } from './GraphNode';
import { useForceLayout, type TickHandler } from './useForceLayout';
import { useGraphGestures } from './useGraphGestures';
import { clampZoom, useViewport } from './useViewport';
import './graph.css';

export interface GraphHandle {
  zoomIn(): void;
  zoomOut(): void;
  fit(): void;
}

interface GraphViewProps {
  items: ArchiveItem[];
  index: LinkIndex;
  selectedId: string | null;
  onSelect(id: string | null): void;
  onOpen(id: string): void;
  focus: { enabled: boolean; depth: number };
  hiddenTypes: readonly ItemType[];
  /** 다른 UI(BottomSheet 등)에 가려지지 않는 높이 비율. 맞춤/중앙 정렬의 기준이 된다. */
  visibleRatio?: number;
  ref?: Ref<GraphHandle>;
}

const round = (value: number | undefined) => (value ?? 0).toFixed(1);

export function GraphView({
  items,
  index,
  selectedId,
  onSelect,
  onOpen,
  focus,
  hiddenTypes,
  visibleRatio = 1,
  ref,
}: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const viewportRef = useRef<SVGGElement>(null);
  const nodeElements = useRef(new Map<string, SVGGElement>());
  const linkElements = useRef(new Map<string, SVGLineElement>());
  const [hoverId, setHoverId] = useState<string | null>(null);

  const focusRootId = focus.enabled ? selectedId : null;
  const model = useMemo(
    () => buildGraphModel(items, index, { hiddenTypes, focusRootId, focusDepth: focus.depth }),
    [items, index, hiddenTypes, focusRootId, focus.depth],
  );

  // 좌표는 React 를 거치지 않고 DOM 속성으로 바로 쓴다
  const writePositions = useCallback<TickHandler>((nodes, links) => {
    for (const node of nodes.values()) {
      nodeElements.current.get(node.id)?.setAttribute('transform', `translate(${round(node.x)} ${round(node.y)})`);
    }
    for (const link of links) {
      const line = linkElements.current.get(link.id);
      if (!line) continue;
      line.setAttribute('x1', round(link.source.x));
      line.setAttribute('y1', round(link.source.y));
      line.setAttribute('x2', round(link.target.x));
      line.setAttribute('y2', round(link.target.y));
    }
  }, []);

  // 화면에 보이지 않는 상태(크기 0)로 마운트되면 첫 맞춤을 크기가 생길 때까지 미룬다
  const initialFitPending = useRef(true);
  const fitRef = useRef<(animate: boolean, comfortable?: boolean) => boolean>(() => false);
  const view = useViewport(containerRef, svgRef, viewportRef, () => {
    if (initialFitPending.current) initialFitPending.current = !fitRef.current(false, true);
  });
  const layout = useForceLayout(model.nodes, model.edges, writePositions);
  const visibleRatioRef = useLatest(visibleRatio);

  // comfortable: 전체가 들어오지 않더라도 읽을 수 있는 배율을 유지한다 (첫 화면용)
  // 맞출 수 없는 상태(노드 없음, 크기 0)면 false 를 돌려준다
  const fit = useCallback(
    (animate: boolean, comfortable = false) => {
      const nodes = [...layout.nodes.current.values()];
      const { width, height } = view.size.current;
      if (!nodes.length || !width || !height) return false;

      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const node of nodes) {
        const x = node.x ?? 0;
        const y = node.y ?? 0;
        minX = Math.min(minX, x - node.r);
        maxX = Math.max(maxX, x + node.r);
        minY = Math.min(minY, y - node.r);
        maxY = Math.max(maxY, y + node.r + GRAPH.fit.labelAllowance);
      }

      const availableHeight = height * visibleRatioRef.current;
      const padding = Math.min(GRAPH.fit.padding, width * GRAPH.fit.maxPaddingRatio);
      const exact = Math.min(
        (width - padding * 2) / Math.max(1, maxX - minX),
        (availableHeight - padding * 2) / Math.max(1, maxY - minY),
      );
      const k = Math.min(GRAPH.zoom.fitMax, clampZoom(comfortable ? Math.max(exact, GRAPH.zoom.comfortMin) : exact));
      view.set(
        { k, x: width / 2 - ((minX + maxX) / 2) * k, y: availableHeight / 2 - ((minY + maxY) / 2) * k },
        animate,
      );
      return true;
    },
    [layout, view, visibleRatioRef],
  );

  const zoomBy = useCallback(
    (factor: number) => {
      const { width, height } = view.size.current;
      const center = { x: width / 2, y: (height * visibleRatioRef.current) / 2 };
      const world = view.toWorld(center);
      const k = clampZoom(view.transform.current.k * factor);
      view.set({ k, x: center.x - world.x * k, y: center.y - world.y * k }, true);
    },
    [view, visibleRatioRef],
  );

  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => zoomBy(GRAPH.zoom.step),
      zoomOut: () => zoomBy(1 / GRAPH.zoom.step),
      fit: () => fit(true),
    }),
    [zoomBy, fit],
  );

  // 첫 화면: 미리 계산된 배치에 맞춰 바로 맞춘다
  useLayoutEffect(() => {
    fitRef.current = fit;
    initialFitPending.current = !fit(false, true);
  }, [fit]);

  // 보이는 노드 구성이 바뀌면(Focus Mode, 타입 필터) 배치가 자리 잡은 뒤 다시 맞춘다
  const subsetKey = `${focusRootId ?? ''}:${focus.depth}:${hiddenTypes.join()}`;
  const previousSubsetKey = useRef(subsetKey);
  useEffect(() => {
    if (previousSubsetKey.current === subsetKey) return;
    previousSubsetKey.current = subsetKey;
    const timer = setTimeout(() => fit(true), GRAPH.fit.delayMs);
    return () => clearTimeout(timer);
  }, [subsetKey, fit]);

  // 선택한 노드가 화면 밖이거나 다른 UI 에 가려지면 보이는 영역 가운데로 옮긴다
  const selectedInGraph = useRef<string | null>(null);
  useEffect(() => {
    if (!selectedId || focus.enabled) return;
    const node = layout.nodes.current.get(selectedId);
    const { width, height } = view.size.current;
    if (!node || !width) return;

    const visibleHeight = height * visibleRatio;
    const screen = view.toScreen({ x: node.x ?? 0, y: node.y ?? 0 });
    const margin = GRAPH.safeMargin;
    const inView =
      screen.x > margin && screen.x < width - margin && screen.y > margin && screen.y < visibleHeight - margin;
    const pickedInGraph = selectedInGraph.current === selectedId;
    selectedInGraph.current = null;
    // 그래프에서 직접 고른 노드는 이미 보이는 위치라면 화면을 움직이지 않는다
    if (pickedInGraph && inView) return;

    const { k } = view.transform.current;
    view.set({ k, x: width / 2 - (node.x ?? 0) * k, y: visibleHeight / 2 - (node.y ?? 0) * k }, true);
  }, [selectedId, focus.enabled, visibleRatio, layout, view]);

  const lastTap = useRef<{ id: string; time: number } | null>(null);
  const select = useCallback(
    (id: string) => {
      selectedInGraph.current = id;
      onSelect(id);
    },
    [onSelect],
  );

  useGraphGestures(svgRef, view, {
    onNodeTap(id) {
      const now = performance.now();
      const previous = lastTap.current;
      lastTap.current = { id, time: now };
      if (previous?.id === id && now - previous.time < GRAPH.gesture.doubleTapMs) onOpen(id);
      else select(id);
    },
    onBackgroundTap: () => onSelect(null),
    onNodeDragStart: layout.startDrag,
    onNodeDrag: layout.drag,
    onNodeDragEnd: layout.endDrag,
  });

  const registerNode = useCallback((id: string, element: SVGGElement | null) => {
    if (element) nodeElements.current.set(id, element);
    else nodeElements.current.delete(id);
  }, []);

  // hover 가 우선, 없으면 선택된 노드를 기준으로 연결을 강조한다
  const activeId = hoverId ?? selectedId;
  const activeNeighbors = activeId ? index.neighbors.get(activeId) : undefined;
  const hoverNeighbors = hoverId ? index.neighbors.get(hoverId) : undefined;

  return (
    <div className="graph" ref={containerRef}>
      <svg
        ref={svgRef}
        className="graph__svg"
        role="group"
        aria-label="아카이브 그래프"
        style={{ '--graph-hit-min': `${GRAPH.node.minHitRadius}px` } as CSSProperties}
      >
        <g ref={viewportRef}>
          <g>
            {model.edges.map((edge) => {
              const touchesActive = edge.source === activeId || edge.target === activeId;
              const touchesHover = edge.source === hoverId || edge.target === hoverId;
              return (
                <line
                  key={edge.id}
                  ref={(element) => {
                    if (element) linkElements.current.set(edge.id, element);
                    else linkElements.current.delete(edge.id);
                  }}
                  className={cx('graph-link', touchesActive && 'is-active', hoverId && !touchesHover && 'is-dimmed')}
                />
              );
            })}
          </g>
          <g>
            {model.nodes.map((node) => (
              <GraphNode
                key={node.id}
                node={node}
                selected={node.id === selectedId}
                emphasized={node.id === activeId || Boolean(activeNeighbors?.has(node.id))}
                dimmed={Boolean(hoverId) && node.id !== hoverId && !hoverNeighbors?.has(node.id)}
                register={registerNode}
                onHover={setHoverId}
                onActivate={select}
              />
            ))}
          </g>
        </g>
      </svg>
    </div>
  );
}
