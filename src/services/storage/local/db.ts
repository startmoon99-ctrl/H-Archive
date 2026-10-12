import { ARCHIVE_DB } from '@/config/app'
import { StorageError, StorageQuotaError } from '../types'

export type StoreName = (typeof ARCHIVE_DB.stores)[keyof typeof ARCHIVE_DB.stores]

let opening: Promise<IDBDatabase> | null = null

function toStorageError(error: DOMException | null): StorageError {
  if (error?.name === 'QuotaExceededError') return new StorageQuotaError('저장 공간이 부족합니다.')
  return new StorageError(error?.message ?? '브라우저 저장소를 사용할 수 없습니다.')
}

function openDb(): Promise<IDBDatabase> {
  opening ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(ARCHIVE_DB.name, ARCHIVE_DB.version)
    request.onupgradeneeded = () => {
      const db = request.result
      const { stores } = ARCHIVE_DB
      db.createObjectStore(stores.categories, { keyPath: 'id' })
      db.createObjectStore(stores.projects, { keyPath: 'id' })
      db.createObjectStore(stores.files)
      db.createObjectStore(stores.meta)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(toStorageError(request.error))
  })
  return opening
}

/**
 * 트랜잭션 하나를 실행하고 완료를 기다린다.
 * run이 요청을 돌려주면 그 결과가, 아니면 undefined가 반환된다.
 */
export async function transact<T = void>(
  names: StoreName[],
  mode: IDBTransactionMode,
  run: (tx: IDBTransaction) => IDBRequest<T> | void,
): Promise<T> {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(names, mode)
    const request = run(tx)
    tx.oncomplete = () => resolve((request ? request.result : undefined) as T)
    tx.onerror = () => reject(toStorageError(tx.error))
    tx.onabort = () => reject(toStorageError(tx.error))
  })
}
