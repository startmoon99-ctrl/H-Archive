import { useEffect, type RefObject } from 'react';
import { GRAPH } from '@/config/graph';
import { useLatest } from '@/hooks/useLatest';
import { clampZoom, type Point, type Viewport } from './useViewport';

interface GestureHandlers {
  onNodeTap(id: string): void;
  onBackgroundTap(): void;
  onNodeDragStart(id: string): void;
  onNodeDrag(id: string, x: number, y: number): void;
  onNodeDragEnd(id: string): void;
}

type Mode = 'idle' | 'pan' | 'node' | 'pinch';

const WHEEL_LINE_HEIGHT = 16;

/**
 * 그래프의 포인터 입력을 한곳에서 해석한다.
 * - 배경 드래그: 이동 / 노드 드래그: 노드 이동 / 두 손가락: 핀치 줌 / 휠: 커서 기준 줌
 * - 임계값 이하로 움직였으면 탭으로 취급한다
 */
export function useGraphGestures(svgRef: RefObject<SVGSVGElement | null>, view: Viewport, handlers: GestureHandlers) {
  const handlersRef = useLatest(handlers);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const pointers = new Map<number, Point>();
    let mode: Mode = 'idle';
    let nodeId: string | null = null;
    let start: Point = { x: 0, y: 0 };
    let last: Point = start;
    let moved = false;
    let pinch = { distance: 1, k: 1, worldX: 0, worldY: 0 };

    const toLocal = (event: MouseEvent): Point => {
      const rect = svg.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    const capture = (pointerId: number) => {
      if (!svg.hasPointerCapture(pointerId)) svg.setPointerCapture(pointerId);
    };

    const measurePinch = () => {
      const [a, b] = [...pointers.values()];
      return {
        distance: Math.max(1, Math.hypot(a.x - b.x, a.y - b.y)),
        center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      };
    };

    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      view.cancel();
      const point = toLocal(event);
      pointers.set(event.pointerId, point);

      if (pointers.size === 1) {
        const target = event.target instanceof Element ? event.target.closest('[data-node-id]') : null;
        nodeId = target?.getAttribute('data-node-id') ?? null;
        mode = nodeId ? 'node' : 'pan';
        start = point;
        last = point;
        moved = false;
        // 마우스는 실제로 움직이기 시작할 때 캡처한다 (클릭만으로 hover 가 풀리지 않게)
        if (event.pointerType !== 'mouse') capture(event.pointerId);
      } else if (pointers.size === 2) {
        if (mode === 'node' && moved && nodeId) handlersRef.current.onNodeDragEnd(nodeId);
        for (const id of pointers.keys()) capture(id);
        mode = 'pinch';
        moved = true;
        const { distance, center } = measurePinch();
        const world = view.toWorld(center);
        pinch = { distance, k: view.transform.current.k, worldX: world.x, worldY: world.y };
      }
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!pointers.has(event.pointerId)) return;
      const point = toLocal(event);
      pointers.set(event.pointerId, point);

      if (mode === 'pinch') {
        if (pointers.size < 2) return;
        const { distance, center } = measurePinch();
        const k = clampZoom((pinch.k * distance) / pinch.distance);
        view.set({ k, x: center.x - pinch.worldX * k, y: center.y - pinch.worldY * k });
        return;
      }

      if (!moved) {
        if (Math.hypot(point.x - start.x, point.y - start.y) < GRAPH.gesture.dragThreshold) return;
        moved = true;
        capture(event.pointerId);
        if (mode === 'node' && nodeId) handlersRef.current.onNodeDragStart(nodeId);
      }

      if (mode === 'pan') {
        const current = view.transform.current;
        view.set({ ...current, x: current.x + point.x - last.x, y: current.y + point.y - last.y });
      } else if (mode === 'node' && nodeId) {
        const world = view.toWorld(point);
        handlersRef.current.onNodeDrag(nodeId, world.x, world.y);
      }
      last = point;
    };

    const onPointerEnd = (event: PointerEvent) => {
      if (!pointers.delete(event.pointerId)) return;

      if (mode === 'pinch') {
        // 한 손가락이 남으면 그대로 이동을 이어간다
        const [remaining] = [...pointers.values()];
        if (remaining) {
          mode = 'pan';
          last = remaining;
        } else {
          mode = 'idle';
        }
        return;
      }
      if (pointers.size > 0) return;

      const cancelled = event.type === 'pointercancel';
      if (mode === 'node' && nodeId) {
        if (moved) handlersRef.current.onNodeDragEnd(nodeId);
        else if (!cancelled) handlersRef.current.onNodeTap(nodeId);
      } else if (mode === 'pan' && !moved && !cancelled) {
        handlersRef.current.onBackgroundTap();
      }
      mode = 'idle';
      nodeId = null;
    };

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      view.cancel();
      const point = toLocal(event);
      const delta = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? event.deltaY * WHEEL_LINE_HEIGHT : event.deltaY;
      const world = view.toWorld(point);
      const k = clampZoom(view.transform.current.k * Math.exp(-delta * GRAPH.zoom.wheelSpeed));
      view.set({ k, x: point.x - world.x * k, y: point.y - world.y * k });
    };

    svg.addEventListener('pointerdown', onPointerDown);
    svg.addEventListener('pointermove', onPointerMove);
    svg.addEventListener('pointerup', onPointerEnd);
    svg.addEventListener('pointercancel', onPointerEnd);
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      svg.removeEventListener('pointerdown', onPointerDown);
      svg.removeEventListener('pointermove', onPointerMove);
      svg.removeEventListener('pointerup', onPointerEnd);
      svg.removeEventListener('pointercancel', onPointerEnd);
      svg.removeEventListener('wheel', onWheel);
    };
  }, [svgRef, view, handlersRef]);
}
