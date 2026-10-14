import { IDBFactory, IDBObjectStore } from 'fake-indexeddb'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { assetFixture, categoryFixture, deferred, projectFixture } from '@/test/archiveFixtures'
import { ARCHIVE_DB } from '@/config/app'

beforeEach(() => {
  vi.resetModules()
  vi.stubGlobal('indexedDB', new IDBFactory())
  let serial = 0
  vi.spyOn(URL, 'createObjectURL').mockImplementation(() => `blob:${++serial}`)
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

async function setup() {
  const { LocalArchiveRepository } = await import('./localArchiveRepository')
  const { LocalMediaStorage } = await import('./localMediaStorage')
  const repository = new LocalArchiveRepository()
  const media = new LocalMediaStorage()
  await repository.saveCategory(categoryFixture())
  return { repository, media, LocalArchiveRepository }
}

describe('local Blob URL cache', () => {
  it('마지막 사용자가 닫힐 때만 URL을 해제하고 다시 열면 새 URL을 만든다', async () => {
    const { media } = await setup()
    await media.put('one', new Blob(['1']))
    const [a, b] = await Promise.all([media.getUrl('one'), media.getUrl('one')])
    media.releaseUrl('one', a!)
    expect(URL.revokeObjectURL).not.toHaveBeenCalled()
    media.releaseUrl('one', b!)
    expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith(a)
    const next = await media.getUrl('one')
    expect(next).not.toBe(a)
    media.releaseUrl('one', a!) // 이전 effect의 뒤늦은 정리가 새 URL에 영향을 주지 않는다.
    expect(URL.revokeObjectURL).toHaveBeenCalledOnce()
    media.releaseUrl('one', next!)
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2)
  })
  it('같은 파일의 동시 요청은 하나의 읽기와 Object URL을 공유하며 clear에서 모두 해제한다', async () => {
    const { media } = await setup()
    await media.put('one', new Blob(['1']))
    await media.put('two', new Blob(['2']))
    const read = vi.spyOn(media, 'getBlob')
    const [a, b, c] = await Promise.all([media.getUrl('one'), media.getUrl('one'), media.getUrl('two')])
    expect(a).toBe(b)
    expect(c).not.toBe(a)
    expect(read).toHaveBeenCalledTimes(2)
    expect(URL.createObjectURL).toHaveBeenCalledTimes(2)
    await media.clear()
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(2)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(a)
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(c)
  })

  it('읽기 중 clear/remove가 끝나면 늦은 Blob으로 URL을 생성하지 않는다', async () => {
    const { media } = await setup()
    await media.put('one', new Blob(['1']))
    const read = deferred<Blob | undefined>()
    vi.spyOn(media, 'getBlob').mockReturnValueOnce(read.promise)
    const url = media.getUrl('one')
    await media.remove(['one'])
    read.resolve(new Blob(['old']))
    expect(await url).toBeUndefined()
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })

  it('put으로 교체하면 이전 URL을 해제하고 새 Blob으로 다시 생성한다', async () => {
    const { media } = await setup()
    await media.put('one', new Blob(['old']))
    const old = await media.getUrl('one')
    await media.put('one', new Blob(['new']))
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(old)
    expect(await media.getUrl('one')).not.toBe(old)
  })

  it('동시 읽기가 실패해도 실패한 promise를 캐시하지 않는다', async () => {
    const { media } = await setup()
    await media.put('one', new Blob(['1']))
    vi.spyOn(media, 'getBlob').mockRejectedValueOnce(new Error('read failed'))
    const results = await Promise.allSettled([media.getUrl('one'), media.getUrl('one')])
    expect(results.map((result) => result.status)).toEqual(['rejected', 'rejected'])
    expect(await media.getUrl('one')).toBeDefined()
    expect(URL.createObjectURL).toHaveBeenCalledOnce()
  })
})

describe('local repository 무결성', () => {
  it('정리 목록 저장까지 실패해도 같은 세션의 다음 재시도에서 파일을 정리한다', async () => {
    const { media } = await setup()
    await media.put('orphan', new Blob(['unused']))
    const originalPut = IDBObjectStore.prototype.put
    const failure = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, ...args) {
      if (this.name === ARCHIVE_DB.stores.meta) throw new Error('journal failed')
      return originalPut.apply(this, args)
    })
    await expect(media.remove(['orphan'])).rejects.toThrow('journal failed')
    expect(await media.getBlob('orphan')).toBeDefined()
    failure.mockRestore()
    await media.retryCleanup()
    expect(await media.getBlob('orphan')).toBeUndefined()
  })

  it('repository가 직접 호출돼도 작품이 있는 성단을 지우지 않는다', async () => {
    const { repository, LocalArchiveRepository } = await setup()
    await new LocalArchiveRepository().saveProject(projectFixture())
    await expect(repository.deleteCategory('category')).rejects.toThrow('창작물이 있는 성단')
  })

  it('성단 삭제와 다른 탭의 작품 추가가 경쟁해도 orphan을 만들지 않는다', async () => {
    const { repository, LocalArchiveRepository } = await setup()
    const otherTab = new LocalArchiveRepository()
    const result = await Promise.allSettled([
      repository.deleteCategory('category'), otherTab.saveProject(projectFixture()),
    ])
    expect(result.map((item) => item.status)).toEqual(['fulfilled', 'rejected'])
    expect(await repository.getProject('project')).toBeUndefined()
    await repository.saveCategory(categoryFixture())
    const reversed = await Promise.allSettled([
      otherTab.saveProject(projectFixture()), repository.deleteCategory('category'),
    ])
    expect(reversed.map((item) => item.status)).toEqual(['fulfilled', 'rejected'])
  })

  it('서로 다른 repository 인스턴스의 atomic 변경은 최신 필드를 유지한다', async () => {
    const { repository, LocalArchiveRepository } = await setup()
    await repository.saveProject(projectFixture())
    await Promise.all([
      repository.mutateProject('project', (project) => ({ ...project!, title: '새 제목' })),
      new LocalArchiveRepository().mutateProject('project', (project) => ({ ...project!, description: '새 설명' })),
    ])
    expect(await repository.getProject('project')).toMatchObject({ title: '새 제목', description: '새 설명' })
  })

  it('존재하지 않는 새 파일 참조를 가진 metadata는 저장하지 않는다', async () => {
    const { repository } = await setup()
    await expect(repository.saveProject(projectFixture([assetFixture()]))).rejects.toThrow('파일이 없어')
    expect(await repository.getProject('project')).toBeUndefined()
  })

  it('정리 목록에 들어 있어도 최신 metadata에서 참조하는 파일은 삭제하지 않는다', async () => {
    const { repository, media } = await setup()
    await media.put('project/asset/original', new Blob(['raw']))
    await repository.saveProject(projectFixture([assetFixture()]))
    await media.remove(['project/asset/original'])
    expect(await media.getBlob('project/asset/original')).toBeDefined()
  })

  it('metadata 삭제와 cleanup 목록은 같은 트랜잭션에 저장된다', async () => {
    const { repository, media } = await setup()
    await media.put('project/asset/original', new Blob(['raw']))
    await repository.saveProject(projectFixture([assetFixture()]))
    await repository.deleteProject('project')
    const { transact } = await import('./db')
    const { CLEANUP_KEY } = await import('./cleanup')
    const pending = await transact<string[]>([ARCHIVE_DB.stores.meta], 'readonly', (tx) => tx.objectStore(ARCHIVE_DB.stores.meta).get(CLEANUP_KEY))
    expect(pending).toEqual(['project/asset/original'])
    await media.retryCleanup()
    expect(await media.getBlob('project/asset/original')).toBeUndefined()
  })
})
