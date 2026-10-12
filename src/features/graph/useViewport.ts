import { useCallback, useLayoutEffect, useMemo, useRef, type RefObject } from 'react';
import { GRAPH } from '@/config/graph';
import { MOTION } from '@/config/motion';
import { useLatest } from '@/hooks/useLatest';

export interface Transform {
  x: number;
  y: number;
  k: number;
}

export interface Point {
  x: number;
  y: number;
}

export const clampZoom = (k: number) => Math.min(GRAPH.zoom.max, Math.max(GRAPH.zoom.min, k));

const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;

/**
 * 그래프의 pan/zoom 상태.
 * 드래그 중 매 프레임 리렌더하지 않도록 transform 은 ref 로 두고 DOM 에 직접 반영한다.
 */
export function useViewport(
  containerRef: RefObject<HTMLDivElement | null>,
  svgRef: RefObject<SVGSVGElement | null>,
  viewportRef: RefObject<SVGGElement | null>,
  /** 컨테이너 크기가 바뀐 뒤 호출된다 */
  onResize?: () => void,
) {
  const transform = useRef<Transform>({ x: 0, y: 0, k: 1 });
  const size = useRef({ width: 0, height: 0 });
  const frame = useRef(0);
  const onResizeRef = useLatest(onResize);

  const apply = useCallback(
    (next: Transform) => {
      transform.current = next;
      viewportRef.current?.setAttribute('transform', `translate(${next.x} ${next.y}) scale(${next.k})`);
      const svg = svgRef.current;
      if (!svg) return;
      svg.dataset.zoom = next.k < GRAPH.zoom.labelThreshold ? 'far' : 'near';
      // 축소해도 터치 영역은 화면 기준 크기를 유지하도록 CSS 에 배율을 알려 준다
      svg.style.setProperty('--graph-zoom', next.k.toFixed(3));
    },
    [svgRef, viewportRef],
  );

  const cancel = useCallback(() => cancelAnimationFrame(frame.current), []);

  const set = useCallback(
    (target: Transform, animate = false) => {
      cancel();
      if (!animate || document.hidden) {
        apply(target);
        return;
      }
      const from = transform.current;
      const startedAt = performance.now();
      const step = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / MOTION.duration.slow);
        const eased = easeOutCubic(progress);
        apply({
          x: from.x + (target.x - from.x) * eased,
          y: from.y + (target.y - from.y) * eased,
          k: from.k + (target.k - from.k) * eased,
        });
        if (progress < 1) frame.current = requestAnimationFrame(step);
      };
      frame.current = requestAnimationFrame(step);
    },
    [apply, cancel],
  );

  const toWorld = useCallback((point: Point): Point => {
    const { x, y, k } = transform.current;
    return { x: (point.x - x) / k, y: (point.y - y) / k };
  }, []);

  const toScreen = useCallback((point: Point): Point => {
    const { x, y, k } = transform.current;
    return { x: point.x * k + x, y: point.y * k + y };
  }, []);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    size.current = { width: rect.width, height: rect.height };
    apply({ x: rect.width / 2, y: rect.height / 2, k: 1 });

    // 패널이 열리고 닫혀도 보고 있던 지점이 화면 중앙에 남도록 보정한다
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      const previous = size.current;
      size.current = { width, height };
      const current = transform.current;
      apply({ ...current, x: current.x + (width - previous.width) / 2, y: current.y + (height - previous.height) / 2 });
      onResizeRef.current?.();
    });
    observer.observe(container);
    return () => {
      observer.disconnect();
      cancel();
    };
  }, [containerRef, apply, cancel, onResizeRef]);

  return useMemo(
    () => ({ transform, size, set, cancel, toWorld, toScreen }),
    [set, cancel, toWorld, toScreen],
  );
}

export type Viewport = ReturnType<typeof useViewport>;
