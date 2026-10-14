import { IDBFactory, IDBObjectStore } from 'fake-indexeddb'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { assetFixture, categoryFixture, deferred, entryFixture, projectFixture } from '@/test/archiveFixtures'
import { ARCHIVE_DB } from '@/config/app'
import type { ProjectDraft } from './archiveService'

vi.mock('./mediaProcessing', () => ({
  describeImage: vi.fn(async () => ({})), describeVideo: vi.fn(async () => ({})),
  createVideoPreview: vi.fn(async (): Promise<Blob | null> => new Blob(['preview'])),
}))
vi.mock('@/data/seed', () => ({
  SEED_ART_VERSION: 1, createSeed: () => ({ categories: [], projects: [] }), refreshSeedArt: () => null,
}))

beforeEach(() => {
  vi.resetModules()
  vi.stubGlobal('indexedDB', new IDBFactory())
  vi.doMock('./storage', async () => {
    const { LocalArchiveRepository } = await import('./storage/local/localArchiveRepository')
    const { LocalMediaStorage } = await import('./storage/local/localMediaStorage')
    return { repository: new LocalArchiveRepository(), mediaStorage: new LocalMediaStorage() }
  })
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals() })

async function setup(withVideo = false) {
  const { archiveService } = await import('./archiveService')
  const { repository, mediaStorage } = await import('./storage')
  const processing = await import('./mediaProcessing')
  await repository.load()
  await repository.saveCategory(categoryFixture())
  if (withVideo) await mediaStorage.put('project/asset/original', new Blob(['raw']))
  const project = projectFixture(withVideo ? [assetFixture()] : [])
  await repository.saveProject(project)
  return { archiveService, repository, mediaStorage, processing, project }
}

async function keys() {
  const { transact } = await import('./storage/local/db')
  return transact<IDBValidKey[]>([ARCHIVE_DB.stores.files], 'readonly', (tx) => tx.objectStore(ARCHIVE_DB.stores.files).getAllKeys())
}

const draft: ProjectDraft = {
  title: '새 작품', categoryId: 'category', description: '', status: 'in-progress',
  startedAt: '2026-01-01', tags: [], links: [], firstMemo: '',
}

describe('로컬 archive 저장 일관성', () => {
  it('preview 생성 중 제목/설명과 타임라인을 편집해도 최신 값을 유지한다', async () => {
    const { archiveService, repository, processing, project } = await setup(true)
    const preview = deferred<Blob | null>()
    vi.mocked(processing.createVideoPreview).mockReturnValueOnce(preview.promise)
    await archiveService.load()
    await vi.waitFor(() => expect(processing.createVideoPreview).toHaveBeenCalledOnce())
    await archiveService.updateProject(project, { title: '최신 제목', description: '최신 설명' })
    await archiveService.saveEntry(project, { ...entryFixture([assetFixture()]), memo: '최신 메모' }, [])
    preview.resolve(new Blob(['preview']))
    await vi.waitFor(async () => expect((await repository.getProject(project.id))?.timeline[0].media[0].preview).toBeDefined())
    expect(await repository.getProject(project.id)).toMatchObject({
      title: '최신 제목', description: '최신 설명', timeline: [{ memo: '최신 메모', media: [{ previewPending: false }] }],
    })
  })

  it('preview 완료 전에 연 폼을 나중에 저장해도 preview 필드를 되돌리지 않는다', async () => {
    const { archiveService, repository, project } = await setup(true)
    await archiveService.load()
    await vi.waitFor(async () => expect((await repository.getProject(project.id))?.timeline[0].media[0].preview).toBeDefined())
    await archiveService.saveEntry(project, { ...entryFixture([assetFixture()]), title: '편집' }, [])
    expect((await repository.getProject(project.id))?.timeline[0].media[0]).toMatchObject({ previewPending: false, preview: { type: 'stored' } })
  })

  it('오래된 프로젝트 객체를 가진 동시 편집은 변경한 필드만 순서대로 적용한다', async () => {
    const { archiveService, repository, project } = await setup()
    await Promise.all([
      archiveService.updateProject(project, { title: '새 제목' }),
      archiveService.updateProject(project, { description: '새 설명' }),
    ])
    expect(await repository.getProject(project.id)).toMatchObject({ title: '새 제목', description: '새 설명' })
  })

  it('기록과 대표 미디어 변경을 같은 metadata 쓰기로 확정한다', async () => {
    const { archiveService, repository, project } = await setup(true)
    const commit = vi.spyOn(repository, 'mutateProject')
    const result = await archiveService.saveEntry(project, {
      ...entryFixture([assetFixture()]), title: '새 기록 제목', coverMediaId: 'asset',
    }, [])
    expect(commit).toHaveBeenCalledOnce()
    expect(result.project).toMatchObject({ coverMediaId: 'asset', timeline: [{ title: '새 기록 제목' }] })
    expect(result.project.timeline[0]).not.toHaveProperty('coverMediaId')
    commit.mockRejectedValueOnce(new Error('metadata failed'))
    await expect(archiveService.saveEntry(result.project, {
      ...entryFixture([assetFixture()]), title: '실패한 변경', coverMediaId: null,
    }, [])).rejects.toThrow('metadata failed')
    expect(await repository.getProject(project.id)).toEqual(result.project)
  })

  it('파일 업로드 후 메타데이터 쓰기가 실패하면 새 파일을 정리하고 기존 기록은 보존한다', async () => {
    const { archiveService, repository, project } = await setup()
    const originalPut = IDBObjectStore.prototype.put
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, ...args) {
      if (this.name === ARCHIVE_DB.stores.projects) throw new DOMException('full', 'QuotaExceededError')
      return originalPut.apply(this, args)
    })
    await expect(archiveService.saveEntry(project, entryFixture(), [new File(['x'], 'x.txt')])).rejects.toThrow('full')
    expect(await repository.getProject(project.id)).toEqual(project)
    expect(await keys()).toEqual([])
  })

  it('cleanup 목록 기록이 실패하면 같은 트랜잭션의 metadata 삭제도 롤백한다', async () => {
    const { archiveService, repository, project } = await setup(true)
    const originalPut = IDBObjectStore.prototype.put
    vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, ...args) {
      if (this.name === ARCHIVE_DB.stores.meta) throw new Error('journal failed')
      return originalPut.apply(this, args)
    })
    await expect(archiveService.removeProject(project)).rejects.toThrow('journal failed')
    expect(await repository.getProject(project.id)).toEqual(project)
    expect(await keys()).toEqual(['project/asset/original'])
  })

  it('신규 프로젝트 metadata 실패 후 cleanup도 실패하면 재실행 때 새 파일을 정리한다', async () => {
    const { archiveService, repository, mediaStorage } = await setup()
    vi.spyOn(repository, 'mutateProject').mockRejectedValueOnce(new Error('metadata failed'))
    const flush = vi.spyOn(mediaStorage, 'retryCleanup').mockRejectedValue(new Error('cleanup failed'))
    await expect(archiveService.createProject(draft, [new File(['x'], 'x.txt')])).rejects.toThrow('metadata failed')
    expect(await keys()).toHaveLength(1)
    expect((await repository.load()).projects).toHaveLength(1)
    flush.mockRestore()
    const { LocalMediaStorage } = await import('./storage/local/localMediaStorage')
    await new LocalMediaStorage().retryCleanup()
    expect(await keys()).toEqual([])
  })

  it('원본 파일 쓰기 실패 시 존재하지 않는 파일을 metadata에 연결하지 않는다', async () => {
    const { archiveService, mediaStorage, repository } = await setup()
    vi.spyOn(mediaStorage, 'put').mockRejectedValueOnce(new Error('file failed'))
    const result = await archiveService.createProject(draft, [new File(['x'], 'x.txt')])
    expect(result.warnings).toHaveLength(1)
    expect(result.project.timeline).toEqual([])
    expect(await repository.getProject(result.project.id)).toEqual(result.project)
    expect(await keys()).toEqual([])
  })

  it('프로젝트 metadata 삭제 후 파일 정리 실패는 성공한 삭제를 실패로 돌리지 않는다', async () => {
    const { archiveService, repository, mediaStorage, project } = await setup(true)
    const cleanup = vi.spyOn(mediaStorage, 'retryCleanup').mockRejectedValueOnce(new Error('disk failure'))
    await expect(archiveService.removeProject(project)).resolves.toBeUndefined()
    expect(await repository.getProject(project.id)).toBeUndefined()
    expect(await keys()).toHaveLength(1)
    cleanup.mockRestore()
    await archiveService.load()
    expect(await keys()).toEqual([])
  })

  it('기록 삭제 후 파일 정리 실패에도 반환값과 DB는 동일한 삭제 상태다', async () => {
    const { archiveService, repository, mediaStorage, project } = await setup(true)
    vi.spyOn(mediaStorage, 'retryCleanup').mockRejectedValueOnce(new Error('disk failure'))
    const result = await archiveService.removeEntry(project, 'entry')
    expect(result.timeline).toEqual([])
    expect(await repository.getProject(project.id)).toEqual(result)
    await archiveService.load()
    expect(await keys()).toEqual([])
  })

  it('여러 파일 정리 중 실패하면 파일 삭제를 롤백하고 UI는 성공한 metadata 삭제를 반영한다', async () => {
    const { repository, mediaStorage, project } = await setup(true)
    const thumbnail = 'project/asset/thumbnail'
    await mediaStorage.put(thumbnail, new Blob(['thumb']))
    project.timeline[0].media[0] = { ...assetFixture(), previewPending: false, thumbnail: { type: 'stored', key: thumbnail } }
    await repository.saveProject(project)
    const { useArchiveStore } = await import('@/store/archiveStore')
    await useArchiveStore.getState().init()
    const originalDelete = IDBObjectStore.prototype.delete
    const failure = vi.spyOn(IDBObjectStore.prototype, 'delete').mockImplementation(function (this: IDBObjectStore, key) {
      if (this.name === ARCHIVE_DB.stores.files && key === thumbnail) throw new Error('second delete failed')
      return originalDelete.call(this, key)
    })
    await useArchiveStore.getState().deleteProject('project')
    expect(useArchiveStore.getState().projects).toEqual([])
    expect(await repository.getProject('project')).toBeUndefined()
    expect(await keys()).toEqual(['project/asset/original', thumbnail])
    failure.mockRestore()
    await mediaStorage.retryCleanup!()
    expect(await keys()).toEqual([])
  })

  it('preview 저장 실패는 경로를 확정하지 않고 다음 실행에서 재시도한다', async () => {
    const { archiveService, repository, mediaStorage } = await setup(true)
    vi.spyOn(mediaStorage, 'put').mockRejectedValueOnce(new Error('preview upload failed'))
    await archiveService.load()
    await vi.waitFor(() => expect(console.warn).toHaveBeenCalledWith('[queue] 작업 실패', expect.any(Error)))
    expect((await repository.getProject('project'))?.timeline[0].media[0]).toMatchObject({ previewPending: true })
    expect((await repository.getProject('project'))?.timeline[0].media[0].preview).toBeUndefined()
    expect(await keys()).toEqual(['project/asset/original'])
    await archiveService.load()
    await vi.waitFor(async () => expect((await repository.getProject('project'))?.timeline[0].media[0].previewPending).toBe(false))
    expect(await keys()).toContain('project/asset/preview')
  })

  it('preview 파일 성공 후 metadata 실패 시 파일을 정리하고 pending은 유지한다', async () => {
    const { archiveService, repository } = await setup(true)
    vi.spyOn(repository, 'mutateProject').mockRejectedValueOnce(new Error('preview metadata failed'))
    await archiveService.load()
    await vi.waitFor(() => expect(console.warn).toHaveBeenCalledWith('[queue] 작업 실패', expect.any(Error)))
    expect(await keys()).toEqual(['project/asset/original'])
    expect((await repository.getProject('project'))?.timeline[0].media[0].previewPending).toBe(true)
  })

  it('preview 생성 중 전체 삭제하면 늦은 작업이 작품이나 파일을 되살리지 않는다', async () => {
    const { archiveService, repository, processing } = await setup(true)
    const preview = deferred<Blob | null>()
    vi.mocked(processing.createVideoPreview).mockReturnValueOnce(preview.promise)
    await archiveService.load()
    await vi.waitFor(() => expect(processing.createVideoPreview).toHaveBeenCalledOnce())
    await archiveService.clearAll()
    const read = vi.spyOn(repository, 'getProject')
    preview.resolve(new Blob(['preview']))
    await vi.waitFor(() => expect(read).toHaveBeenCalled())
    expect(await repository.getProject('project')).toBeUndefined()
    expect(await keys()).toEqual([])
  })

  it('전체 삭제의 cleanup 실패도 metadata 삭제 결과를 유지하고 재시도한다', async () => {
    const { archiveService, repository, mediaStorage } = await setup(true)
    vi.spyOn(mediaStorage, 'retryCleanup').mockRejectedValueOnce(new Error('cleanup failed'))
    await expect(archiveService.clearAll()).resolves.toBeUndefined()
    expect(await repository.load()).toEqual({ categories: [], projects: [] })
    await archiveService.load()
    expect(await keys()).toEqual([])
  })

  it('작품이 있는 성단 삭제를 service에서도 거부한다', async () => {
    const { archiveService, repository } = await setup()
    const remove = vi.spyOn(repository, 'deleteCategory')
    await expect(archiveService.removeCategory('category')).rejects.toThrow('창작물이 있는 성단')
    expect(remove).not.toHaveBeenCalled()
  })
})
