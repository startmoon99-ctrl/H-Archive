import { ARCHIVE_DB } from '@/config/app'

export const CLEANUP_KEY = 'pendingMediaCleanup'

/** 메타데이터 변경과 같은 트랜잭션에 남겨, 탭을 닫아도 정리 대상을 잃지 않는다. */
export function scheduleCleanup(tx: IDBTransaction, keys: string[], abort: (cause: unknown) => void): void {
  if (keys.length === 0) return
  const store = tx.objectStore(ARCHIVE_DB.stores.meta)
  const request = store.get(CLEANUP_KEY)
  request.onsuccess = () => {
    try {
      const pending = (request.result as string[] | undefined) ?? []
      store.put([...new Set([...pending, ...keys])], CLEANUP_KEY)
    } catch (error) {
      abort(error)
    }
  }
}
