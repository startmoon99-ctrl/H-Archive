import type { ArchiveItem } from '@/types/archive';
import { buildLinkIndex, type LinkIndex } from '@/utils/links';
import { useArchiveStore } from './archiveStore';

// items 배열이 바뀔 때만 다시 계산하고, 모든 컴포넌트가 같은 결과를 공유한다
const itemMapCache = new WeakMap<ArchiveItem[], Map<string, ArchiveItem>>();
const linkIndexCache = new WeakMap<ArchiveItem[], LinkIndex>();

export function getItemMap(items: ArchiveItem[]): Map<string, ArchiveItem> {
  let map = itemMapCache.get(items);
  if (!map) {
    map = new Map(items.map((item) => [item.id, item]));
    itemMapCache.set(items, map);
  }
  return map;
}

export function getLinkIndex(items: ArchiveItem[]): LinkIndex {
  let index = linkIndexCache.get(items);
  if (!index) {
    index = buildLinkIndex(items);
    linkIndexCache.set(items, index);
  }
  return index;
}

export const useItems = () => useArchiveStore((state) => state.items);
export const useItemMap = () => getItemMap(useItems());
export const useLinkIndex = () => getLinkIndex(useItems());
export const useItem = (id: string | null | undefined) =>
  useArchiveStore((state) => (id ? getItemMap(state.items).get(id) : undefined));
