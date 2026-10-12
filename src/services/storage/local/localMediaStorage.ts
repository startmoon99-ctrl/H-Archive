import { ARCHIVE_DB } from '@/config/app'
import type { MediaStorage, StorageEstimate } from '../types'
import { transact } from './db'

const { files } = ARCHIVE_DB.stores

/** 파일을 IndexedDB에 Blob으로 저장하고 object URL로 내준다. */
export class LocalMediaStorage implements MediaStorage {
  private urls = new Map<string, string>()

  put(key: string, blob: Blob): Promise<void> {
    this.revoke(key)
    return transact([files], 'readwrite', (tx) => void tx.objectStore(files).put(blob, key))
  }

  getBlob(key: string): Promise<Blob | undefined> {
    return transact<Blob | undefined>([files], 'readonly', (tx) => tx.objectStore(files).get(key))
  }

  async getUrl(key: string): Promise<string | undefined> {
    const cached = this.urls.get(key)
    if (cached) return cached
    const blob = await this.getBlob(key)
    if (!blob) return undefined
    const url = URL.createObjectURL(blob)
    this.urls.set(key, url)
    return url
  }

  remove(keys: string[]): Promise<void> {
    for (const key of keys) this.revoke(key)
    return transact([files], 'readwrite', (tx) => {
      for (const key of keys) tx.objectStore(files).delete(key)
    })
  }

  clear(): Promise<void> {
    for (const key of [...this.urls.keys()]) this.revoke(key)
    return transact([files], 'readwrite', (tx) => void tx.objectStore(files).clear())
  }

  /** navigator.storage는 https / localhost에서만 있다 */
  async estimate(): Promise<StorageEstimate | null> {
    const result = await navigator.storage?.estimate?.()
    if (!result) return null
    return { usage: result.usage ?? 0, quota: result.quota ?? 0 }
  }

  private revoke(key: string): void {
    const url = this.urls.get(key)
    if (!url) return
    URL.revokeObjectURL(url)
    this.urls.delete(key)
  }
}
