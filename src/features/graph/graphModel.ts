import { GRAPH } from '@/config/graph';
import type { ItemType } from '@/config/itemTypes';
import type { ArchiveItem } from '@/types/archive';
import { getNeighborhood, type LinkEdge, type LinkIndex } from '@/utils/links';

export interface GraphNodeData {
  id: string;
  item: ArchiveItem;
  degree: number;
  radius: number;
}

export type GraphEdgeData = LinkEdge;

export interface GraphModel {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
}

interface GraphModelOptions {
  hiddenTypes: readonly ItemType[];
  /** Focus Mode 의 중심 노드. null 이면 전체 그래프 */
  focusRootId: string | null;
  focusDepth: number;
}

/** Item 목록과 연결 인덱스에서 화면에 그릴 노드/간선만 추려 낸다 */
export function buildGraphModel(items: ArchiveItem[], index: LinkIndex, options: GraphModelOptions): GraphModel {
  const { hiddenTypes, focusRootId, focusDepth } = options;
  const hidden = new Set(hiddenTypes);
  const focusIds =
    focusRootId && index.neighbors.has(focusRootId) ? getNeighborhood(focusRootId, index, focusDepth) : null;
  const { baseRadius, radiusPerDegree, maxRadius } = GRAPH.node;

  const nodes = items
    .filter((item) => {
      if (item.id === focusRootId) return true;
      if (focusIds && !focusIds.has(item.id)) return false;
      return !hidden.has(item.type);
    })
    .map((item) => {
      const degree = index.neighbors.get(item.id)?.size ?? 0;
      return {
        id: item.id,
        item,
        degree,
        radius: Math.min(maxRadius, baseRadius + Math.sqrt(degree) * radiusPerDegree),
      };
    });

  const visible = new Set(nodes.map((node) => node.id));
  const edges = index.edges.filter((edge) => visible.has(edge.source) && visible.has(edge.target));

  return { nodes, edges };
}
