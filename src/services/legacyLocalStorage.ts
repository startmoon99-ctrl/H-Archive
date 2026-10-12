import { STORAGE_KEYS } from '@/config/app';
import type { ArchiveItem } from '@/types/archive';
import { isValidItem } from './itemValidation';

/**
 * IndexedDB 로 옮기기 전, localStorage 에 저장하던 Archive 데이터를 읽는다.
 * 읽기만 하고 지우지 않는다 — 이전이 끝난 뒤에도 원본이 백업으로 남는다.
 * 저장된 적이 없거나 해석할 수 없으면 null.
 */
export function readLegacyItems(): ArchiveItem[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.legacyItems);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isValidItem) : null;
  } catch {
    return null;
  }
}
