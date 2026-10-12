import type { ArchiveSnapshot, Category, ID, Project } from '@/types/archive'

/**
 * 저장소 경계. UI와 store는 이 인터페이스 뒤에 무엇이 있는지 모른다.
 * 지금은 브라우저(IndexedDB) 구현체를 쓰고, 원격 DB · Object Storage로 옮길 때는
 * 같은 인터페이스의 구현체를 추가한 뒤 storage/index.ts에서 교체한다.
 */

export class StorageError extends Error {
  override name = 'StorageError'
}

/** 저장 공간이 부족하다 */
export class StorageQuotaError extends StorageError {
  override name = 'StorageQuotaError'
}

/** 프로젝트 메타데이터 · 타임라인 · 메모 */
export interface ArchiveRepository {
  load(): Promise<ArchiveSnapshot>
  getProject(id: ID): Promise<Project | undefined>
  saveCategory(category: Category): Promise<void>
  deleteCategory(id: ID): Promise<void>
  saveProject(project: Project): Promise<void>
  deleteProject(id: ID): Promise<void>
  clear(): Promise<void>
}

export interface PutOptions {
  /** 0 ~ 1. 원격 구현체가 대용량 업로드 진행률을 알릴 때 쓴다. */
  onProgress?: (ratio: number) => void
  signal?: AbortSignal
}

export interface StorageEstimate {
  usage: number
  quota: number
}

/**
 * 원본 · 썸네일 · Preview 파일.
 * 원격 구현체는 put에서 브라우저 → Storage 직접 업로드(resumable)를 하고,
 * getUrl에서 서명된 주소를 돌려주면 된다.
 */
export interface MediaStorage {
  put(key: string, blob: Blob, options?: PutOptions): Promise<void>
  getBlob(key: string): Promise<Blob | undefined>
  /** 화면에 바로 쓸 수 있는 주소 */
  getUrl(key: string): Promise<string | undefined>
  remove(keys: string[]): Promise<void>
  clear(): Promise<void>
  estimate(): Promise<StorageEstimate | null>
}
