import { ARCHIVE_DB } from '@/config/app'
import type { Project } from '@/types/archive'
import { allMedia, storedMediaKeys } from '@/utils/project'
import type { MediaStorage, StorageEstimate } from '../types'
import { transact } from './db'
import { CLEANUP_KEY, scheduleCleanup } from './cleanup'

const { files, projects, meta } = ARCHIVE_DB.stores

/** 파일을 IndexedDB에 Blob으로 저장하고 object URL로 내준다. */
export class LocalMediaStorage implements MediaStorage {
  private urls = new Map<string, string>()
  private pending = new Map<string, Promise<string | undefined>>()
  private users = new Map<string, number>()
  /** 정리 목록 자체의 쓰기가 실패해도 현재 세션에서는 재시도 대상을 잃지 않는다. */
  private cleanupToRecord = new Set<string>()

  async put(key: string, blob: Blob): Promise<void> {
    await transact([files], 'readwrite', (tx) => void tx.objectStore(files).put(blob, key))
    this.revoke(key)
  }

  getBlob(key: string): Promise<Blob | undefined> {
    return transact<Blob | undefined>([files], 'readonly', (tx) => tx.objectStore(files).get(key))
  }

  async getUrl(key: string): Promise<string | undefined> {
    const url = await this.resolveUrl(key)
    if (!url || this.urls.get(key) !== url) return undefined
    this.users.set(url, (this.users.get(url) ?? 0) + 1)
    return url
  }

  releaseUrl(key: string, url: string): void {
    if (this.urls.get(key) !== url) return
    const remaining = (this.users.get(url) ?? 0) - 1
    if (remaining > 0) this.users.set(url, remaining)
    else this.revoke(key)
  }

  private resolveUrl(key: string): Promise<string | undefined> {
    const cached = this.urls.get(key)
    if (cached) return Promise.resolve(cached)
    const pending = this.pending.get(key)
    if (pending) return pending
    const request = this.getBlob(key).then((blob) => {
      // 읽는 중 삭제·교체된 파일의 URL을 다시 만들지 않는다.
      if (!blob || this.pending.get(key) !== request) return undefined
      const url = URL.createObjectURL(blob)
      this.urls.set(key, url)
      return url
    }).finally(() => {
      if (this.pending.get(key) === request) this.pending.delete(key)
    })
    this.pending.set(key, request)
    return request
  }

  async remove(keys: string[]): Promise<void> {
    for (const key of keys) this.cleanupToRecord.add(key)
    await this.recordCleanup()
    await this.retryCleanup()
  }

  async clear(): Promise<void> {
    await transact([files, meta], 'readwrite', (tx, abort) => {
      const request = tx.objectStore(files).getAllKeys()
      request.onsuccess = () => scheduleCleanup(tx, request.result as string[], abort)
    })
    await this.retryCleanup()
    for (const key of new Set([...this.urls.keys(), ...this.pending.keys()])) this.revoke(key)
  }

  private async recordCleanup(): Promise<void> {
    const unrecorded = [...this.cleanupToRecord]
    if (unrecorded.length > 0) {
      await transact([meta], 'readwrite', (tx, abort) => scheduleCleanup(tx, unrecorded, abort))
      for (const key of unrecorded) this.cleanupToRecord.delete(key)
    }
  }

  async retryCleanup(): Promise<void> {
    await this.recordCleanup()
    const removed: string[] = []
    await transact([files, projects, meta], 'readwrite', (tx, abort) => {
      const request = tx.objectStore(meta).get(CLEANUP_KEY)
      request.onsuccess = () => {
        const keys = request.result as string[] | undefined ?? []
        if (keys.length === 0) return
        const records = tx.objectStore(projects).getAll()
        records.onsuccess = () => {
          try {
            const referenced = new Set((records.result as Project[]).flatMap((project) => storedMediaKeys(allMedia(project))))
            for (const key of keys) {
              if (referenced.has(key)) continue
              tx.objectStore(files).delete(key)
              removed.push(key)
            }
            tx.objectStore(meta).delete(CLEANUP_KEY)
          } catch (error) {
            abort(error)
          }
        }
      }
    })
    // 실패 시에는 파일·정리 목록·기존 URL 모두 유지된다.
    for (const key of removed) this.revoke(key)
  }

  /** navigator.storage는 https / localhost에서만 있다 */
  async estimate(): Promise<StorageEstimate | null> {
    const result = await navigator.storage?.estimate?.()
    if (!result) return null
    return { usage: result.usage ?? 0, quota: result.quota ?? 0 }
  }

  private revoke(key: string): void {
    this.pending.delete(key)
    const url = this.urls.get(key)
    if (!url) return
    URL.revokeObjectURL(url)
    this.users.delete(url)
    this.urls.delete(key)
  }
}
