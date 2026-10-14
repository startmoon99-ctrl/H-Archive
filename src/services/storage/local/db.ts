import { ARCHIVE_DB } from '@/config/app'
import { StorageError, StorageQuotaError } from '../types'

export type StoreName = (typeof ARCHIVE_DB.stores)[keyof typeof ARCHIVE_DB.stores]

/** 스키마 변경 한 단계. tx는 업그레이드 트랜잭션으로, 기존 store의 index나 데이터를 고칠 때 쓴다. */
type Migration = (db: IDBDatabase, tx: IDBTransaction) => void

const { stores } = ARCHIVE_DB

/** 없을 때만 만든다. 이미 있는 store를 다시 만들면 오류가 나고 업그레이드 전체가 취소된다. */
function ensureStore(db: IDBDatabase, name: StoreName, options?: IDBObjectStoreParameters): void {
  if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, options)
}

/**
 * 스키마 변경 이력. 키는 그 변경으로 도달하는 version이다.
 * 스키마를 바꿀 때는 ARCHIVE_DB.version을 올리고 같은 번호의 항목을 여기에 더한다.
 * 이미 배포한 항목은 고치지 않는다(그 version을 지나온 브라우저에서는 다시 실행되지 않는다).
 */
const MIGRATIONS: Record<number, Migration> = {
  1: (db) => {
    ensureStore(db, stores.categories, { keyPath: 'id' })
    ensureStore(db, stores.projects, { keyPath: 'id' })
    ensureStore(db, stores.files)
    ensureStore(db, stores.meta)
  },
}

/** 이 브라우저가 지나오지 않은 변경만 순서대로 적용한다. 새 DB의 oldVersion은 0이다. */
export function migrate(
  db: IDBDatabase,
  tx: IDBTransaction,
  oldVersion: number,
  newVersion: number,
  migrations: Record<number, Migration> = MIGRATIONS,
): void {
  for (let version = oldVersion + 1; version <= newVersion; version += 1) migrations[version]?.(db, tx)
}

let opening: Promise<IDBDatabase> | null = null

function toStorageError(error: DOMException | null): StorageError {
  if (error?.name === 'QuotaExceededError') return new StorageQuotaError('저장 공간이 부족합니다.')
  return new StorageError(error?.message ?? '브라우저 저장소를 사용할 수 없습니다.')
}

function openDb(): Promise<IDBDatabase> {
  opening ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(ARCHIVE_DB.name, ARCHIVE_DB.version)
    request.onupgradeneeded = (event) => {
      // 업그레이드 중에는 request.transaction이 항상 있다
      migrate(request.result, request.transaction!, event.oldVersion, event.newVersion ?? ARCHIVE_DB.version)
    }
    request.onsuccess = () => {
      const db = request.result
      const forget = () => {
        opening = null
      }
      // 다른 탭이 더 높은 version으로 열려고 하면 비켜 준다. 붙잡고 있으면 그 탭의 업그레이드가 끝나지 않는다.
      db.onversionchange = () => {
        db.close()
        forget()
      }
      db.onclose = forget
      resolve(db)
    }
    request.onerror = () => reject(toStorageError(request.error))
  }).catch((error: unknown) => {
    // 실패한 연결을 붙들고 있지 않는다. 다음 요청이 처음부터 다시 연다.
    opening = null
    throw error
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
  run: (tx: IDBTransaction, abort: (cause: unknown) => void) => IDBRequest<T> | void,
): Promise<T> {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(names, mode)
    let failure: unknown
    let request: IDBRequest<T> | void
    tx.oncomplete = () => resolve((request ? request.result : undefined) as T)
    tx.onerror = () => reject(failure ?? toStorageError(tx.error))
    tx.onabort = () => reject(failure ?? toStorageError(tx.error))
    const abort = (cause: unknown) => {
      failure = cause
      tx.abort()
    }
    try {
      request = run(tx, abort)
    } catch (error) {
      abort(error)
    }
  })
}
