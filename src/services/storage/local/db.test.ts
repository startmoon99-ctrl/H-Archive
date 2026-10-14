import { describe, expect, it } from 'vitest'
import { ARCHIVE_DB } from '@/config/app'
import { migrate } from './db'

/** 실제 IndexedDB처럼 이미 있는 store를 다시 만들면 오류를 낸다 */
function fakeDb(existing: string[] = []) {
  const names = new Set(existing)
  const created: string[] = []
  const db = {
    objectStoreNames: { contains: (name: string) => names.has(name) },
    createObjectStore(name: string) {
      if (names.has(name)) throw new DOMException(`'${name}' already exists`, 'ConstraintError')
      names.add(name)
      created.push(name)
      return {}
    },
  } as unknown as IDBDatabase
  return { db, names, created }
}

const tx = {} as IDBTransaction
const allStores = Object.values(ARCHIVE_DB.stores)

describe('migrate', () => {
  it('새 DB에는 설정에 있는 모든 store를 만든다', () => {
    const { db, names } = fakeDb()
    migrate(db, tx, 0, ARCHIVE_DB.version)
    expect([...names].sort()).toEqual([...allStores].sort())
  })

  it('이미 지나온 version의 변경은 다시 실행하지 않는다', () => {
    const { db, created } = fakeDb(allStores)
    const ran: number[] = []
    migrate(db, tx, 1, 3, {
      1: () => ran.push(1),
      2: (target) => {
        ran.push(2)
        target.createObjectStore('added')
      },
      3: () => ran.push(3),
    })
    expect(ran).toEqual([2, 3])
    expect(created).toEqual(['added'])
  })

  it('store가 이미 있어도 충돌하지 않는다', () => {
    const { db, created } = fakeDb(allStores)
    expect(() => migrate(db, tx, 0, ARCHIVE_DB.version)).not.toThrow()
    expect(created).toEqual([])
  })

  it('변경이 없는 version은 건너뛴다', () => {
    const { db, created } = fakeDb(allStores)
    expect(() => migrate(db, tx, ARCHIVE_DB.version, ARCHIVE_DB.version + 1)).not.toThrow()
    expect(created).toEqual([])
  })
})
