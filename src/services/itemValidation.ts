import { isItemType } from '@/config/itemTypes';
import type { ArchiveItem } from '@/types/archive';

/** 저장소에서 읽은 값이 앱이 다룰 수 있는 Item 인지 확인한다 (손상되었거나 알 수 없는 타입의 데이터 걸러내기) */
export function isValidItem(value: unknown): value is ArchiveItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<ArchiveItem>;
  return (
    typeof item.id === 'string' &&
    typeof item.title === 'string' &&
    typeof item.content === 'string' &&
    typeof item.createdAt === 'string' &&
    typeof item.updatedAt === 'string' &&
    isItemType(item.type) &&
    Array.isArray(item.tags) &&
    Array.isArray(item.links)
  );
}
