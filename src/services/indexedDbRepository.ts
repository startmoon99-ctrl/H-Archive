import { ARCHIVE_DB } from '@/config/app';
import { createSampleItems } from '@/data/sampleItems';
import type { ArchiveItem } from '@/types/archive';
import { StorageUnavailableError, StorageWriteError, type ArchiveRepository } from './archiveRepository';
import { isValidItem } from './itemValidation';
import { readLegacyItems } from './legacyLocalStorage';

const { items: ITEMS, meta: META } = ARCHIVE_DB.stores;

/** meta store 에 남기는 "초기 데이터를 이미 넣었다"는 표시 */
const INITIALIZED_KEY = 'initialized';

interface InitializedRecord {
  key: typeof INITIALIZED_KEY;
  /** 처음 데이터를 어디에서 가져왔는지 */
  source: 'sample' | 'localStorage' | 'existing';
  at: string;
}

const byCreatedAt = (a: ArchiveItem, b: ArchiveItem) =>
  a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id);

function upgrade(db: IDBDatabase, oldVersion: number) {
  if (oldVersion < 1) {
    db.createObjectStore(ITEMS, { keyPath: 'id' });
    db.createObjectStore(META, { keyPath: 'key' });
  }
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new StorageUnavailableError());
      return;
    }
    let request: IDBOpenDBRequest;
    try {
      request = indexedDB.open(ARCHIVE_DB.name, ARCHIVE_DB.version);
    } catch (error) {
      // 저장소 접근이 막힌 환경에서는 open 자체가 예외를 던진다
      reject(new StorageUnavailableError(error));
      return;
    }
    request.onupgradeneeded = (event) => upgrade(request.result, event.oldVersion);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new StorageUnavailableError(request.error));
  });
}

/**
 * 트랜잭션 하나를 실행하고, 실제로 commit 된 뒤에 결과를 돌려준다.
 * work 가 돌려준 request 가 있으면 그 결과를, 없으면 undefined 를 resolve 한다.
 */
function runTransaction<T = void>(
  db: IDBDatabase,
  storeNames: string[],
  mode: IDBTransactionMode,
  work: (transaction: IDBTransaction) => IDBRequest<T> | undefined,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const fail = (cause: unknown) =>
      reject(mode === 'readonly' ? new StorageUnavailableError(cause) : new StorageWriteError(cause));

    let transaction: IDBTransaction;
    let request: IDBRequest<T> | undefined;
    try {
      transaction = db.transaction(storeNames, mode);
    } catch (error) {
      fail(error);
      return;
    }
    // 용량 초과 등으로 중단되면 이 트랜잭션에서 쓴 내용은 전부 되돌려진다
    transaction.oncomplete = () => resolve(request ? request.result : (undefined as T));
    transaction.onabort = () => fail(transaction.error);
    try {
      request = work(transaction);
    } catch (error) {
      // 복제할 수 없는 값 등으로 put 이 바로 실패한 경우
      transaction.onabort = null;
      try {
        transaction.abort();
      } catch {
        // 이미 끝난 트랜잭션
      }
      fail(error);
    }
  });
}

/**
 * 처음 한 번만 초기 데이터를 넣는다.
 * - localStorage 에 예전 Archive 데이터가 있으면 그대로 옮긴다 (원본은 지우지 않는다).
 * - 없으면 샘플 데이터를 넣는다.
 * 데이터와 "초기화함" 표시를 같은 트랜잭션에 기록하므로 도중에 실패하면 아무것도 남지 않고 다음 실행에서 다시 시도한다.
 * 표시가 있으면 다시 넣지 않는다 — 사용자가 항목을 모두 지운 뒤에 예전 데이터가 되살아나지 않게 하기 위함.
 */
function initialize(db: IDBDatabase): Promise<void> {
  return runTransaction(db, [ITEMS, META], 'readwrite', (transaction) => {
    const itemStore = transaction.objectStore(ITEMS);
    const metaStore = transaction.objectStore(META);

    const marker = metaStore.get(INITIALIZED_KEY);
    marker.onsuccess = () => {
      if (marker.result) return;

      const count = itemStore.count();
      count.onsuccess = () => {
        let source: InitializedRecord['source'] = 'existing';
        if (count.result === 0) {
          const legacy = readLegacyItems();
          source = legacy ? 'localStorage' : 'sample';
          for (const item of legacy ?? createSampleItems()) itemStore.put(item);
        }
        const record: InitializedRecord = { key: INITIALIZED_KEY, source, at: new Date().toISOString() };
        metaStore.put(record);
      };
    };
  });
}

/** Archive Item 을 이 기기(브라우저)의 IndexedDB 에 저장하는 구현체. 기기 간 동기화는 하지 않는다. */
export function createIndexedDbRepository(): ArchiveRepository {
  let connection: Promise<IDBDatabase> | null = null;

  const connect = (): Promise<IDBDatabase> => {
    connection ??= openDatabase()
      .then(async (db) => {
        // 다른 탭이 schema 를 올리려 하면 길을 비켜 주고, 다음 요청 때 다시 연다
        const release = () => {
          connection = null;
        };
        db.onversionchange = () => {
          db.close();
          release();
        };
        db.onclose = release;
        try {
          await initialize(db);
        } catch (error) {
          db.close();
          throw error;
        }
        return db;
      })
      .catch((error: unknown) => {
        connection = null;
        throw error;
      });
    return connection;
  };

  return {
    async list() {
      const db = await connect();
      const stored = await runTransaction<unknown[]>(db, [ITEMS], 'readonly', (transaction) =>
        transaction.objectStore(ITEMS).getAll(),
      );
      return stored.filter(isValidItem).sort(byCreatedAt);
    },

    async upsert(items) {
      const db = await connect();
      await runTransaction(db, [ITEMS], 'readwrite', (transaction) => {
        const store = transaction.objectStore(ITEMS);
        for (const item of items) store.put(item);
      });
    },

    async remove(id) {
      const db = await connect();
      await runTransaction(db, [ITEMS], 'readwrite', (transaction) => {
        transaction.objectStore(ITEMS).delete(id);
      });
    },

    async replaceAll(items) {
      const db = await connect();
      // 비우기와 채우기를 한 트랜잭션에 묶어 중간 상태가 남지 않게 한다
      await runTransaction(db, [ITEMS], 'readwrite', (transaction) => {
        const store = transaction.objectStore(ITEMS);
        store.clear();
        for (const item of items) store.put(item);
      });
    },
  };
}
