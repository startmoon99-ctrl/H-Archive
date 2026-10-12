import { FileText, Film, FolderKanban, Gamepad2, Image, Link2, type LucideIcon } from 'lucide-react';

/** 상세 화면에서 타입별 본문 위에 표시되는 미디어 형태 */
export type MediaKind = 'none' | 'image' | 'video' | 'embed' | 'link';

interface ItemTypeSpec {
  label: string;
  icon: LucideIcon;
  color: { light: string; dark: string };
  media: MediaKind;
  /** Gallery 기본 필터에 포함할지 여부 */
  gallery: boolean;
  /** 외부 주소 입력이 필요한 타입만 지정 */
  url?: { label: string; placeholder: string };
  coverLabel: string;
  contentPlaceholder: string;
}

const defineItemTypes = <T extends Record<string, ItemTypeSpec>>(types: T) => types;

/**
 * 콘텐츠 타입 레지스트리.
 * 새 타입은 여기에 항목 하나만 추가하면 Explorer / Graph / Gallery / Editor에 모두 반영된다.
 */
export const ITEM_TYPES = defineItemTypes({
  memo: {
    label: '메모',
    icon: FileText,
    color: { light: '#c98a1e', dark: '#e0aa4a' },
    media: 'none',
    gallery: false,
    coverLabel: '커버 이미지',
    contentPlaceholder: '생각을 적어 보세요…',
  },
  photo: {
    label: '사진',
    icon: Image,
    color: { light: '#259a80', dark: '#3fbf9f' },
    media: 'image',
    gallery: true,
    coverLabel: '사진',
    contentPlaceholder: '사진에 대한 설명…',
  },
  video: {
    label: '영상',
    icon: Film,
    color: { light: '#d9567a', dark: '#ee7b99' },
    media: 'video',
    gallery: true,
    url: { label: '영상 주소', placeholder: 'YouTube 링크 또는 mp4 주소' },
    coverLabel: '썸네일',
    contentPlaceholder: '영상에 대한 설명…',
  },
  game: {
    label: '게임',
    icon: Gamepad2,
    color: { light: '#8a5fe0', dark: '#a98bf2' },
    media: 'embed',
    gallery: true,
    url: { label: '게임 주소', placeholder: '플레이할 수 있는 웹게임 주소' },
    coverLabel: '썸네일',
    contentPlaceholder: '게임 소개, 조작법…',
  },
  project: {
    label: '프로젝트',
    icon: FolderKanban,
    color: { light: '#2f84d4', dark: '#5aa6ee' },
    media: 'none',
    gallery: false,
    coverLabel: '커버 이미지',
    contentPlaceholder: '프로젝트 개요, 목표, 진행 상황…',
  },
  link: {
    label: '링크',
    icon: Link2,
    color: { light: '#6f7f90', dark: '#96a5b5' },
    media: 'link',
    gallery: false,
    url: { label: '링크 주소', placeholder: 'https://' },
    coverLabel: '커버 이미지',
    contentPlaceholder: '이 링크를 저장한 이유…',
  },
});

export type ItemType = keyof typeof ITEM_TYPES;

export interface ItemTypeConfig extends ItemTypeSpec {
  id: ItemType;
}

export const ITEM_TYPE_LIST: ItemTypeConfig[] = (Object.keys(ITEM_TYPES) as ItemType[]).map((id) => ({
  id,
  ...ITEM_TYPES[id],
}));

const typeById = new Map(ITEM_TYPE_LIST.map((type) => [type.id, type]));

export const DEFAULT_ITEM_TYPE: ItemType = 'memo';

export const isItemType = (value: unknown): value is ItemType =>
  typeof value === 'string' && typeById.has(value as ItemType);

export const getItemType = (id: ItemType): ItemTypeConfig => typeById.get(id)!;

/** 타입 색상은 styles/injectTokens.ts 가 CSS 변수로 주입한다 */
export const typeColorVar = (id: ItemType) => `var(--type-${id})`;
