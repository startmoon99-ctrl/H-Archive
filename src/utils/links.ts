import type { ArchiveItem } from '@/types/archive';
import { createWikiLinkResolver, extractWikiLinks, type WikiLinkResolver } from './wikilinks';

export interface LinkEdge {
  id: string;
  source: string;
  target: string;
}

export interface LinkIndex {
  /** 명시적 links + 본문 위키링크를 합친 나가는 연결 */
  outgoing: Map<string, string[]>;
  backlinks: Map<string, string[]>;
  /** 방향을 무시한 인접 노드 */
  neighbors: Map<string, Set<string>>;
  /** 방향을 무시하고 중복을 제거한 간선 */
  edges: LinkEdge[];
  /** 본문 WikiLink 의 target → Item id. 해석 방식은 utils/wikilinks.ts 가 정한다. */
  resolveWikiLink: WikiLinkResolver;
}

export function buildLinkIndex(items: ArchiveItem[]): LinkIndex {
  const outgoing = new Map<string, string[]>();
  const backlinks = new Map<string, string[]>();
  const neighbors = new Map<string, Set<string>>();
  const resolveWikiLink = createWikiLinkResolver(items);
  const edges: LinkEdge[] = [];
  const edgeIds = new Set<string>();

  for (const item of items) {
    backlinks.set(item.id, []);
    neighbors.set(item.id, new Set());
  }

  for (const item of items) {
    const targets = new Set<string>();
    for (const id of item.links) {
      if (neighbors.has(id)) targets.add(id);
    }
    for (const link of extractWikiLinks(item.content)) {
      const id = resolveWikiLink(link.target);
      if (id) targets.add(id);
    }
    targets.delete(item.id);
    outgoing.set(item.id, [...targets]);

    for (const target of targets) {
      backlinks.get(target)!.push(item.id);
      neighbors.get(item.id)!.add(target);
      neighbors.get(target)!.add(item.id);
      const edgeId = item.id < target ? `${item.id}--${target}` : `${target}--${item.id}`;
      if (!edgeIds.has(edgeId)) {
        edgeIds.add(edgeId);
        edges.push({ id: edgeId, source: item.id, target });
      }
    }
  }

  return { outgoing, backlinks, neighbors, edges, resolveWikiLink };
}

/** rootId 에서 depth 단계 이내로 연결된 노드 id (root 포함) */
export function getNeighborhood(rootId: string, index: LinkIndex, depth: number): Set<string> {
  const visited = new Set([rootId]);
  let frontier = [rootId];
  for (let step = 0; step < depth && frontier.length; step += 1) {
    const next: string[] = [];
    for (const id of frontier) {
      for (const neighbor of index.neighbors.get(id) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          next.push(neighbor);
        }
      }
    }
    frontier = next;
  }
  return visited;
}

const SHARED_TAG_WEIGHT = 2;
const COMMON_NEIGHBOR_WEIGHT = 1;

/** 직접 연결되지는 않았지만 태그나 이웃을 공유하는 항목 */
export function getRelatedIds(item: ArchiveItem, items: ArchiveItem[], index: LinkIndex, limit: number): string[] {
  const direct = index.neighbors.get(item.id) ?? new Set<string>();
  const tags = new Set(item.tags);

  return items
    .filter((other) => other.id !== item.id && !direct.has(other.id))
    .map((other) => {
      const sharedTags = other.tags.filter((tag) => tags.has(tag)).length;
      let commonNeighbors = 0;
      for (const neighbor of index.neighbors.get(other.id) ?? []) {
        if (direct.has(neighbor)) commonNeighbors += 1;
      }
      return { id: other.id, score: sharedTags * SHARED_TAG_WEIGHT + commonNeighbors * COMMON_NEIGHBOR_WEIGHT };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.id);
}
