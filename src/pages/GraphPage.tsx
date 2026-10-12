import { Plus, Waypoints } from 'lucide-react';
import { useMemo, useRef } from 'react';
import { EmptyState } from '@/components/EmptyState';
import { GRAPH } from '@/config/graph';
import type { ItemType } from '@/config/itemTypes';
import { GraphControls } from '@/features/graph/GraphControls';
import { GraphView, type GraphHandle } from '@/features/graph/GraphView';
import { useItemActions } from '@/hooks/useItemActions';
import { useLayout } from '@/hooks/useLayout';
import { useItems, useLinkIndex } from '@/store/selectors';
import { useUiStore } from '@/store/uiStore';

export function GraphPage() {
  const items = useItems();
  const index = useLinkIndex();
  const layout = useLayout();
  const { open } = useItemActions();
  const graphRef = useRef<GraphHandle>(null);

  const selectedId = useUiStore((state) => state.selectedId);
  const select = useUiStore((state) => state.select);
  const openEditor = useUiStore((state) => state.openEditor);
  const { focusMode, focusDepth, hiddenTypes } = useUiStore((state) => state.graph);

  const counts = useMemo(() => {
    const result = new Map<ItemType, number>();
    for (const item of items) result.set(item.type, (result.get(item.type) ?? 0) + 1);
    return result;
  }, [items]);
  const focus = useMemo(() => ({ enabled: focusMode, depth: focusDepth }), [focusMode, focusDepth]);

  const hasSelection = Boolean(selectedId && index.neighbors.has(selectedId));

  if (!items.length) {
    return (
      <EmptyState
        icon={Waypoints}
        title="아직 기록이 없어요"
        description="첫 항목을 만들면 여기에 노드로 나타나요"
        action={
          <button type="button" className="btn btn--primary" onClick={() => openEditor()}>
            <Plus size={16} aria-hidden />새 항목
          </button>
        }
      />
    );
  }

  return (
    <div className="graph-page">
      <GraphView
        ref={graphRef}
        items={items}
        index={index}
        selectedId={hasSelection ? selectedId : null}
        onSelect={select}
        onOpen={open}
        focus={focus}
        hiddenTypes={hiddenTypes}
        // 모바일에서는 BottomSheet 가 아래쪽 절반을 가린다
        visibleRatio={layout === 'mobile' && hasSelection ? GRAPH.mobileVisibleRatio : 1}
      />
      <GraphControls graphRef={graphRef} counts={counts} hasSelection={hasSelection} />
    </div>
  );
}
