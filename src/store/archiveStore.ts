import { create } from 'zustand';
import { DuplicateTitleError } from '@/services/archiveErrors';
import { StorageUnavailableError, StorageWriteError } from '@/services/archiveRepository';
import { archiveService } from '@/services/archiveService';
import type { ArchiveItem, ItemDraft, ItemPatch } from '@/types/archive';
import { toast } from './toastStore';

type Status = 'loading' | 'ready' | 'error';

interface ArchiveState {
  items: ArchiveItem[];
  status: Status;
  /** status 가 error 일 때 사용자에게 보여 줄 설명 */
  loadError: string | null;
  load(): Promise<void>;
  createItem(draft: ItemDraft): Promise<ArchiveItem | null>;
  updateItem(id: string, patch: ItemPatch): Promise<ArchiveItem | null>;
  deleteItem(id: string): Promise<boolean>;
  resetToSample(): Promise<void>;
}

const MESSAGES = {
  quota: '저장 공간이 부족해요. 큰 이미지를 줄이거나 항목을 정리해 주세요.',
  failed: '저장하지 못했어요. 다시 시도해 주세요.',
  unavailable:
    '이 브라우저에서는 기기 저장소(IndexedDB)를 사용할 수 없어요. 사생활 보호 모드나 사이트 데이터 차단 설정을 확인해 주세요.',
  loadFailed: '저장된 기록을 읽지 못했어요. 페이지를 새로고침해 주세요.',
  linksRetargeted: (count: number) => `다른 항목 ${count}개의 링크도 새 제목으로 바꿨어요`,
} as const;

/** 오류 종류에 맞는 안내 문구. 저장소 구현이 무엇이든 오류 계열(StorageError)만 보고 판단한다. */
function describeError(error: unknown, fallback: string): string {
  if (error instanceof DuplicateTitleError) return error.message;
  if (error instanceof StorageUnavailableError) return MESSAGES.unavailable;
  if (error instanceof StorageWriteError) return MESSAGES.quota;
  return fallback;
}

function reportError(error: unknown) {
  // 제목 중복은 사용자가 고칠 입력 문제이므로 콘솔 오류로 남기지 않는다
  if (!(error instanceof DuplicateTitleError)) console.error(error);
  toast(describeError(error, MESSAGES.failed), 'error');
}

/** UI가 구독하는 메모리 상태. 실제 읽기/쓰기는 전부 archiveService 를 거친다. */
export const useArchiveStore = create<ArchiveState>((set) => ({
  items: [],
  status: 'loading',
  loadError: null,

  async load() {
    try {
      set({ items: await archiveService.list(), status: 'ready', loadError: null });
    } catch (error) {
      console.error(error);
      set({ status: 'error', loadError: describeError(error, MESSAGES.loadFailed) });
    }
  },

  async createItem(draft) {
    try {
      const item = await archiveService.create(draft);
      set((state) => ({ items: [...state.items, item] }));
      return item;
    } catch (error) {
      reportError(error);
      return null;
    }
  },

  async updateItem(id, patch) {
    try {
      const { item, affected } = await archiveService.update(id, patch);
      const changed = new Map([item, ...affected].map((entry) => [entry.id, entry]));
      set((state) => ({ items: state.items.map((current) => changed.get(current.id) ?? current) }));
      if (affected.length) toast(MESSAGES.linksRetargeted(affected.length));
      return item;
    } catch (error) {
      reportError(error);
      return null;
    }
  },

  async deleteItem(id) {
    try {
      const affected = new Map((await archiveService.remove(id)).map((item) => [item.id, item]));
      set((state) => ({
        items: state.items.filter((item) => item.id !== id).map((item) => affected.get(item.id) ?? item),
      }));
      return true;
    } catch (error) {
      reportError(error);
      return false;
    }
  },

  async resetToSample() {
    try {
      set({ items: await archiveService.resetToSample() });
    } catch (error) {
      reportError(error);
    }
  },
}));
