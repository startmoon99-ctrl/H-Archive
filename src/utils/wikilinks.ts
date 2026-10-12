import type { ArchiveItem } from '@/types/archive';

/**
 * WikiLink 문법과 해석 규칙의 단일 출처.
 *
 * 지금은 [[제목]] 을 "제목"으로 해석한다. 그래서 제목은 Archive 전체에서 유일해야 하고(findTitleConflict),
 * 제목이 바뀌면 그 Item 을 가리키던 링크를 함께 고쳐야 한다(retargetWikiLinks).
 *
 * ID 기반 링크(예: [[id|표시 이름]])로 바꿀 때는 이 파일의 parse / format / resolver 만 바꾸면 된다.
 * 호출하는 쪽은 "링크의 target 문자열"과 "target → Item id" 만 알고, 그것이 제목이라는 사실에는 기대지 않는다.
 */

const TARGET = String.raw`[^[\]\n]+?`;

/** 다른 정규식에 끼워 넣기 위한, 캡처 그룹이 없는 WikiLink 패턴 */
export const WIKILINK_SOURCE = String.raw`\[\[${TARGET}\]\]`;

const WIKILINK_GLOBAL = new RegExp(String.raw`\[\[(${TARGET})\]\]`, 'g');
const WIKILINK_EXACT = new RegExp(String.raw`^\[\[(${TARGET})\]\]$`);

export interface WikiLink {
  /** 본문에 적힌 그대로의 문자열 */
  raw: string;
  /** 링크가 가리키는 대상 (현재는 제목) */
  target: string;
}

/** 제목 비교 기준: 앞뒤 공백과 대소문자 차이는 같은 제목으로 본다 */
export const normalizeTitle = (title: string) => title.trim().toLowerCase();

export const formatWikiLink = (title: string) => `[[${title}]]`;

/** 문자열 전체가 WikiLink 하나일 때만 해석한다 */
export function parseWikiLink(raw: string): WikiLink | null {
  const match = raw.match(WIKILINK_EXACT);
  const target = match?.[1].trim();
  return target ? { raw, target } : null;
}

/** 이 제목을 WikiLink 로 적을 수 있는지 (대괄호 · 줄바꿈이 들어가면 적을 수 없다) */
export const canWikiLink = (title: string) => parseWikiLink(formatWikiLink(title)) !== null;

export function extractWikiLinks(content: string): WikiLink[] {
  return Array.from(content.matchAll(WIKILINK_GLOBAL), (match) => ({ raw: match[0], target: match[1].trim() })).filter(
    (link) => link.target,
  );
}

/** 본문의 WikiLink 만 골라 바꾼다. 링크 밖의 글자는 건드리지 않는다. */
export function replaceWikiLinks(content: string, replace: (link: WikiLink) => string): string {
  return content.replace(WIKILINK_GLOBAL, (raw: string, target: string) => {
    const trimmed = target.trim();
    return trimmed ? replace({ raw, target: trimmed }) : raw;
  });
}

/** 링크 target → Item id. 가리키는 Item 이 없으면 undefined. */
export type WikiLinkResolver = (target: string) => string | undefined;

export function createWikiLinkResolver(items: ArchiveItem[]): WikiLinkResolver {
  const idByTitle = new Map<string, string>();
  for (const item of items) {
    const key = normalizeTitle(item.title);
    // 제목 유일성 규칙 이전의 데이터에 중복이 남아 있으면 먼저 만든 쪽을 가리킨다
    if (!idByTitle.has(key)) idByTitle.set(key, item.id);
  }
  return (target) => idByTitle.get(normalizeTitle(target));
}

/**
 * targetId 를 가리키던 WikiLink 를 새 제목으로 바꾼다.
 * 이름을 바꾸기 "전" 기준의 resolver 를 넘겨야 한다. 내용이 실제로 바뀐 Item 만 새 객체로 돌려준다.
 */
export function retargetWikiLinks(
  items: ArchiveItem[],
  resolve: WikiLinkResolver,
  targetId: string,
  newTitle: string,
): ArchiveItem[] {
  // 새 제목을 링크로 적을 수 없으면 기존 링크를 그대로 둔다 (깨진 문법으로 바꾸는 것보다 "없는 항목"으로 보이는 편이 낫다)
  if (!canWikiLink(newTitle)) return [];
  const replacement = formatWikiLink(newTitle);

  return items.flatMap((item) => {
    const content = replaceWikiLinks(item.content, (link) =>
      resolve(link.target) === targetId ? replacement : link.raw,
    );
    return content === item.content ? [] : [{ ...item, content }];
  });
}

/**
 * 같은 제목을 이미 쓰고 있는 다른 Item 을 찾는다.
 * self 는 편집 중인 Item — 제목을 바꾸지 않았다면(normalizeTitle 기준) 충돌로 보지 않는다.
 */
export function findTitleConflict(items: ArchiveItem[], title: string, self?: ArchiveItem): ArchiveItem | undefined {
  const key = normalizeTitle(title);
  if (!key || (self && normalizeTitle(self.title) === key)) return undefined;
  return items.find((item) => item.id !== self?.id && normalizeTitle(item.title) === key);
}

/** base 가 이미 쓰이고 있으면 "base 2", "base 3" … 중 비어 있는 제목을 돌려준다 */
export function makeUniqueTitle(base: string, items: ArchiveItem[], exceptId?: string): string {
  const taken = new Set(items.filter((item) => item.id !== exceptId).map((item) => normalizeTitle(item.title)));
  if (!taken.has(normalizeTitle(base))) return base;
  let suffix = 2;
  while (taken.has(normalizeTitle(`${base} ${suffix}`))) suffix += 1;
  return `${base} ${suffix}`;
}
