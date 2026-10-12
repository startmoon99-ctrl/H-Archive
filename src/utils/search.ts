import { LIMITS } from '@/config/app';
import type { ItemType } from '@/config/itemTypes';
import type { ArchiveItem } from '@/types/archive';
import { byUpdatedDesc } from './date';
import { toPlainText } from './text';

const SCORE = {
  titlePrefix: 10,
  title: 6,
  tagExact: 5,
  tag: 3,
  content: 1,
} as const;

export interface SearchOptions {
  types?: ReadonlySet<ItemType>;
  excludeIds?: ReadonlySet<string>;
  limit?: number;
}

function scoreToken(item: ArchiveItem, token: string, content: string): number {
  // "#태그" 는 태그만 검색한다
  if (token.startsWith('#')) {
    const tag = token.slice(1);
    if (!tag) return 0;
    return item.tags.reduce((best, current) => {
      const value = current.toLowerCase();
      if (value === tag) return Math.max(best, SCORE.tagExact);
      return value.includes(tag) ? Math.max(best, SCORE.tag) : best;
    }, 0);
  }

  let score = 0;
  const title = item.title.toLowerCase();
  if (title.startsWith(token)) score += SCORE.titlePrefix;
  else if (title.includes(token)) score += SCORE.title;
  for (const tag of item.tags) {
    const value = tag.toLowerCase();
    if (value === token) score += SCORE.tagExact;
    else if (value.includes(token)) score += SCORE.tag;
  }
  if (content.includes(token)) score += SCORE.content;
  return score;
}

/** 검색어가 비어 있으면 최근 수정 순으로 돌려준다 */
export function searchItems(items: ArchiveItem[], query: string, options: SearchOptions = {}): ArchiveItem[] {
  const { types, excludeIds, limit = LIMITS.searchResults } = options;
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  const candidates = items.filter(
    (item) => (!types || types.has(item.type)) && (!excludeIds || !excludeIds.has(item.id)),
  );

  if (!tokens.length) return [...candidates].sort(byUpdatedDesc).slice(0, limit);

  const scored: { item: ArchiveItem; score: number }[] = [];
  for (const item of candidates) {
    const content = toPlainText(item.content).toLowerCase();
    let total = 0;
    let matchedAll = true;
    for (const token of tokens) {
      const score = scoreToken(item, token, content);
      if (!score) {
        matchedAll = false;
        break;
      }
      total += score;
    }
    if (matchedAll) scored.push({ item, score: total });
  }

  return scored
    .sort((a, b) => b.score - a.score || byUpdatedDesc(a.item, b.item))
    .slice(0, limit)
    .map((entry) => entry.item);
}
