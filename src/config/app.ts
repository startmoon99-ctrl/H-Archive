export const APP_NAME = 'H Archive';

/** localStorage 키. Archive Item 은 IndexedDB(ARCHIVE_DB)에 저장하고, 여기에는 소량의 설정만 둔다. */
export const STORAGE_KEYS = {
  preferences: 'h-archive:preferences:v1',
  /** IndexedDB 로 옮기기 전에 Archive Item 을 저장하던 키. 최초 1회 이전할 때만 읽는다. */
  legacyItems: 'h-archive:items:v1',
} as const;

/** Archive Item 을 저장하는 IndexedDB. schema 를 바꾸면 version 을 올리고 indexedDbRepository 의 upgrade 에 단계를 추가한다. */
export const ARCHIVE_DB = {
  name: 'h-archive',
  version: 1,
  stores: {
    /** keyPath: id */
    items: 'items',
    /** 초기화 여부 같은 저장소 자체의 상태. keyPath: key */
    meta: 'meta',
  },
} as const;

export const UNTITLED = '제목 없음';

export const LIMITS = {
  searchResults: 30,
  pickerResults: 6,
  inspectorRecent: 6,
  relatedItems: 6,
  tagSuggestions: 6,
  excerptLength: 160,
  graphLabelLength: 16,
} as const;

export const IMAGE_UPLOAD = {
  maxDimension: 1280,
  quality: 0.82,
  mimeType: 'image/jpeg',
} as const;

export const TOAST_DURATION = 2600;

/** BottomSheet 스냅 동작 */
export const SHEET = {
  /** peek 상태에서 보이는 높이 비율 */
  peekRatio: 0.5,
  dragThreshold: 6,
  snapDistance: 48,
  /** peek 아래로 이 비율 이상 끌어내리면 닫는다 */
  closeRatio: 0.4,
} as const;
