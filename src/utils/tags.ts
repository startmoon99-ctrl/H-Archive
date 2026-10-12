import type { ArchiveItem } from '@/types/archive';

export const normalizeTag = (raw: string) => raw.trim().replace(/^#+/, '').replace(/\s+/g, '-');

export interface TagCount {
  tag: string;
  count: number;
}

export function getTagCounts(items: ArchiveItem[]): TagCount[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const tag of item.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'ko'));
}
