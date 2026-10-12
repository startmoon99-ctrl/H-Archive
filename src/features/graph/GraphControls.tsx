import { Focus, Maximize, Minus, Plus, ZoomIn, ZoomOut } from 'lucide-react';
import type { RefObject } from 'react';
import { IconButton } from '@/components/IconButton';
import { TypeFilter } from '@/components/TypeFilter';
import { GRAPH } from '@/config/graph';
import type { ItemType } from '@/config/itemTypes';
import { useUiStore } from '@/store/uiStore';
import type { GraphHandle } from './GraphView';

interface GraphControlsProps {
  graphRef: RefObject<GraphHandle | null>;
  counts: ReadonlyMap<ItemType, number>;
  hasSelection: boolean;
}

/** 그래프 위에 떠 있는 조작부: 타입 필터(범례) · Focus Mode · 확대/축소 */
export function GraphControls({ graphRef, counts, hasSelection }: GraphControlsProps) {
  const { focusMode, focusDepth, hiddenTypes } = useUiStore((state) => state.graph);
  const setFocusMode = useUiStore((state) => state.setFocusMode);
  const setFocusDepth = useUiStore((state) => state.setFocusDepth);
  const toggleGraphType = useUiStore((state) => state.toggleGraphType);

  return (
    <div className="graph-controls">
      <div className="graph-controls__filters">
        <TypeFilter isActive={(type) => !hiddenTypes.includes(type)} onToggle={toggleGraphType} counts={counts} />
      </div>

      <div className="graph-controls__tools">
        <div className="graph-controls__group">
          <button
            type="button"
            className="graph-controls__focus"
            aria-pressed={focusMode}
            onClick={() => setFocusMode(!focusMode)}
          >
            <Focus size={16} aria-hidden />
            포커스
          </button>
          {focusMode && (
            <div className="graph-controls__depth" role="group" aria-label="포커스 범위">
              <IconButton
                icon={Minus}
                label="범위 줄이기"
                size="s"
                disabled={focusDepth <= GRAPH.focus.minDepth}
                onClick={() => setFocusDepth(focusDepth - 1)}
              />
              <span aria-live="polite">{focusDepth}단계</span>
              <IconButton
                icon={Plus}
                label="범위 넓히기"
                size="s"
                disabled={focusDepth >= GRAPH.focus.maxDepth}
                onClick={() => setFocusDepth(focusDepth + 1)}
              />
            </div>
          )}
          <IconButton icon={Maximize} label="전체 보기" onClick={() => graphRef.current?.fit()} />
        </div>
        {focusMode && !hasSelection && <p className="graph-controls__hint">노드를 선택하면 연결된 항목만 보여요</p>}
      </div>

      <div className="graph-controls__zoom graph-controls__group">
        <IconButton icon={ZoomIn} label="확대" onClick={() => graphRef.current?.zoomIn()} />
        <IconButton icon={ZoomOut} label="축소" onClick={() => graphRef.current?.zoomOut()} />
      </div>
    </div>
  );
}
