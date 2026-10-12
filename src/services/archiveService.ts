import { UNTITLED } from '@/config/app';
import { createSampleItems } from '@/data/sampleItems';
import type { ArchiveItem, ItemDraft, ItemPatch } from '@/types/archive';
import { createId } from '@/utils/id';
import { normalizeTag } from '@/utils/tags';
import { firstLine, truncate } from '@/utils/text';
import { createWikiLinkResolver, findTitleConflict, makeUniqueTitle, retargetWikiLinks } from '@/utils/wikilinks';
import { DuplicateTitleError } from './archiveErrors';
import type { ArchiveRepository } from './archiveRepository';
import { createIndexedDbRepository } from './indexedDbRepository';

const TITLE_FROM_CONTENT_LENGTH = 40;

const unique = <T>(values: T[]) => [...new Set(values)];
const optional = (value?: string) => value?.trim() || undefined;

/** 제목을 뺀 입력값을 저장 가능한 형태로 정리한다 (태그/링크 중복 제거 등). 제목은 resolveTitle 이 정한다. */
function normalize(input: ItemPatch, selfId: string): ItemPatch {
  const next = { ...input };
  if (next.tags) next.tags = unique(next.tags.map(normalizeTag).filter(Boolean));
  if (next.links) next.links = unique(next.links).filter((id) => id !== selfId);
  if ('url' in next) next.url = optional(next.url);
  if ('thumbnail' in next) next.thumbnail = optional(next.thumbnail);
  return next;
}

/**
 * 저장할 제목을 확정한다.
 * - 직접 적은 제목이 다른 Item 과 겹치면 저장을 거부한다 (DuplicateTitleError).
 * - 비워 둔 제목은 본문 첫 줄에서 만들고, 겹치면 번호를 붙여 빠른 저장을 막지 않는다.
 */
function resolveTitle(input: string, content: string, items: ArchiveItem[], self?: ArchiveItem): string {
  const typed = input.trim();
  if (!typed) {
    const derived = truncate(firstLine(content), TITLE_FROM_CONTENT_LENGTH) || UNTITLED;
    return makeUniqueTitle(derived, items, self?.id);
  }
  const conflict = findTitleConflict(items, typed, self);
  if (conflict) throw new DuplicateTitleError(conflict);
  return typed;
}

export interface UpdateResult {
  item: ArchiveItem;
  /** 이름 변경으로 본문의 WikiLink 가 함께 고쳐진 다른 Item */
  affected: ArchiveItem[];
}

export function createArchiveService(repository: ArchiveRepository) {
  return {
    list: () => repository.list(),

    async create(draft: ItemDraft): Promise<ArchiveItem> {
      const items = await repository.list();
      const now = new Date().toISOString();
      const id = createId();
      const item: ArchiveItem = {
        ...draft,
        ...normalize(draft, id),
        title: resolveTitle(draft.title, draft.content, items),
        id,
        createdAt: now,
        updatedAt: now,
      };
      await repository.upsert([item]);
      return item;
    },

    async update(id: string, patch: ItemPatch): Promise<UpdateResult> {
      const items = await repository.list();
      const current = items.find((item) => item.id === id);
      if (!current) throw new Error(`Item not found: ${id}`);

      let item: ArchiveItem = { ...current, ...normalize(patch, id), updatedAt: new Date().toISOString() };
      if (patch.title !== undefined) item.title = resolveTitle(patch.title, item.content, items, current);

      let affected: ArchiveItem[] = [];
      if (item.title !== current.title) {
        // 이름이 바뀌면 이 Item 을 가리키던 [[기존 제목]] 을 모두 새 제목으로 옮긴다.
        // 어떤 링크가 이 Item 을 가리켰는지는 이름을 바꾸기 전 상태로 판단한다.
        const retargeted = retargetWikiLinks(
          items.map((other) => (other.id === id ? item : other)),
          createWikiLinkResolver(items),
          id,
          item.title,
        );
        item = retargeted.find((changed) => changed.id === id) ?? item;
        // 사용자가 직접 고친 것이 아니므로 다른 Item 의 수정일은 그대로 둔다
        affected = retargeted.filter((changed) => changed.id !== id);
      }

      // 이름과 링크가 어긋난 상태로 남지 않도록 한 번에 기록한다
      await repository.upsert([item, ...affected]);
      return { item, affected };
    },

    /** 삭제하면서 다른 Item이 가진 연결도 함께 정리한다. 수정된 Item 목록을 돌려준다. */
    async remove(id: string): Promise<ArchiveItem[]> {
      const affected = (await repository.list())
        .filter((item) => item.id !== id && item.links.includes(id))
        .map((item) => ({ ...item, links: item.links.filter((link) => link !== id) }));
      await repository.remove(id);
      if (affected.length) await repository.upsert(affected);
      return affected;
    },

    async resetToSample(): Promise<ArchiveItem[]> {
      const items = createSampleItems();
      await repository.replaceAll(items);
      return items;
    },
  };
}

export type ArchiveService = ReturnType<typeof createArchiveService>;

/** 앱 전체가 사용하는 단일 인스턴스. Backend 교체 시 이 한 줄의 repository 만 바꾼다. */
export const archiveService = createArchiveService(createIndexedDbRepository());
