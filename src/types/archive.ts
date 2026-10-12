import type { ItemType } from '@/config/itemTypes';

export interface Attachment {
  id: string;
  name: string;
  url: string;
}

/** 모든 자료가 공유하는 단일 모델. 타입별 차이는 config/itemTypes.ts 가 결정한다. */
export interface ArchiveItem {
  id: string;
  type: ItemType;
  title: string;
  /** 본문. [[제목]] 형식의 위키링크로 다른 Item을 연결할 수 있다. */
  content: string;
  tags: string[];
  /** 명시적으로 연결한 Item id. Backlink는 저장하지 않고 utils/links.ts 에서 계산한다. */
  links: string[];
  /** 이미지 주소 또는 data URL */
  thumbnail?: string;
  /** 영상 / 게임 / 링크의 원본 주소 */
  url?: string;
  attachments?: Attachment[];
  createdAt: string;
  updatedAt: string;
}

export type ItemDraft = Pick<ArchiveItem, 'type' | 'title' | 'content' | 'tags' | 'links'> &
  Partial<Pick<ArchiveItem, 'thumbnail' | 'url' | 'attachments'>>;

export type ItemPatch = Partial<ItemDraft>;
