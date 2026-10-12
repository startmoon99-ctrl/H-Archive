import type { ArchiveItem } from '@/types/archive';

/**
 * 저장소 계약. archiveService 는 이 인터페이스에만 의존한다.
 * IndexedDB → Supabase 로 바꿀 때는 이 인터페이스의 새 구현체만 추가하면 된다.
 */
export interface ArchiveRepository {
  list(): Promise<ArchiveItem[]>;
  upsert(items: ArchiveItem[]): Promise<void>;
  remove(id: string): Promise<void>;
  replaceAll(items: ArchiveItem[]): Promise<void>;
}

/** 저장소 계층에서 나는 오류의 공통 부모 */
export class StorageError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = new.target.name;
    this.cause = cause;
  }
}

/** 기록 실패 (용량 초과 등) */
export class StorageWriteError extends StorageError {
  constructor(cause?: unknown) {
    super('저장 공간에 기록하지 못했습니다.', cause);
  }
}

/** 저장소를 열거나 읽을 수 없음 (브라우저가 지원하지 않거나 접근을 막은 경우) */
export class StorageUnavailableError extends StorageError {
  constructor(cause?: unknown) {
    super('이 브라우저에서는 기기 저장소를 사용할 수 없습니다.', cause);
  }
}
