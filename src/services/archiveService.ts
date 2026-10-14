import { REMOTE } from '@/config/app'
import { FIRST_ENTRY_TITLE, type ProjectStatusId } from '@/config/catalog'
import { detectMediaKind, type MediaKind } from '@/config/media'
import type {
  ArchiveSnapshot,
  Category,
  ID,
  ISODate,
  LinkRef,
  MediaAsset,
  MediaSource,
  Project,
  TimelineEntry,
} from '@/types/archive'
import { createId } from '@/utils/id'
import { allMedia, storedMediaKeys as storedKeys } from '@/utils/project'
import { createSerialQueue } from '@/utils/serialQueue'
import { createKeyedQueue } from '@/utils/keyedQueue'
import { createVideoPreview, describeImage, describeVideo, type VisualInfo } from './mediaProcessing'
import { mediaStorage, repository } from './storage'
import { StorageQuotaError, type StorageEstimate } from './storage/types'

/**
 * Archive의 업무 규칙. store는 여기만 호출하고 저장 방식과 미디어 처리를 알지 못한다.
 * 저장 순서: 파일(썸네일 · 큰 화면용 이미지 · 원본) → 메타데이터 → 백그라운드에서 영상 Preview.
 */

export interface CategoryDraft {
  name: string
  description: string
  hue: number
}

export interface ProjectDraft {
  title: string
  categoryId: ID
  description: string
  status: ProjectStatusId
  startedAt: ISODate
  tags: string[]
  links: LinkRef[]
  /** 첫 기록에 남길 그때의 생각 */
  firstMemo: string
}

export type ProjectPatch = Partial<
  Pick<Project, 'title' | 'categoryId' | 'description' | 'status' | 'startedAt' | 'tags' | 'links' | 'coverMediaId'>
>

export interface EntryDraft {
  /** 있으면 기존 기록을 고친다 */
  id?: ID
  date: ISODate
  title: string
  memo: string
  version: string
  tech: string[]
  links: LinkRef[]
  /** 남겨 둘 기존 미디어 */
  media: MediaAsset[]
  /** 사용자가 대표 미디어를 바꿨을 때만 전달한다. 기록과 한 번에 확정한다. */
  coverMediaId?: ID | null
}

export interface SaveProgress {
  label: string
  current: number
  total: number
}

export type ProgressFn = (progress: SaveProgress) => void

export interface SaveResult {
  project: Project
  /** 저장은 됐지만 사용자가 알아야 하는 일 */
  warnings: string[]
}

interface PreviewJob {
  projectId: ID
  assetId: ID
  /** 방금 받은 파일. 없으면 저장된 원본에서 읽는다. */
  source?: Blob
}

const DESCRIBERS: Partial<Record<MediaKind, (file: Blob) => Promise<VisualInfo>>> = {
  image: describeImage,
  gif: describeImage,
  video: describeVideo,
}

const listeners = new Set<(project: Project) => void>()
const writes = createKeyedQueue()
let clearing: Promise<void> = Promise.resolve()

function withProject<T>(id: ID, work: () => Promise<T>): Promise<T> {
  const barrier = clearing
  return writes.run(id, async () => {
    await barrier
    return work()
  })
}

/** 메타데이터가 최종 상태다. 로컬 정리 실패는 저장 성공을 취소하지 않고 재시도 목록에 남긴다. */
async function cleanup(keys: string[] = []): Promise<void> {
  if (!mediaStorage.retryCleanup) {
    await mediaStorage.remove(keys)
    return
  }
  try {
    if (keys.length > 0) await mediaStorage.remove(keys)
    else await mediaStorage.retryCleanup()
  } catch (error) {
    console.warn('[archive] 파일 정리를 다음 작업 또는 실행 때 재시도합니다.', error)
  }
}

function requireProject(project: Project | undefined): Project {
  if (!project) throw new Error('프로젝트가 삭제되어 저장하지 못했습니다.')
  return project
}

async function changeProject(
  id: ID,
  change: (current: Project | undefined) => Project | undefined,
): Promise<Project | undefined> {
  if (repository.mutateProject) return repository.mutateProject(id, change)
  const next = change(await repository.getProject(id))
  if (next) await repository.saveProject(next)
  else await repository.deleteProject(id)
  return next
}

function now(): string {
  return new Date().toISOString()
}

function stored(key: string): MediaSource {
  return { type: 'stored', key }
}

const enqueuePreview = createSerialQueue<PreviewJob>(async ({ projectId, assetId, source }) => {
  const key = `${projectId}/${assetId}`
  const original = source ?? (await mediaStorage.getBlob(`${key}/original`))
  if (!original) return // 원본을 읽지 못하면 다음 실행에서 재시도한다.
  const preview = await createVideoPreview(original)
  await withProject(projectId, async () => {
    const current = await repository.getProject(projectId)
    if (!current || !allMedia(current).some((asset) => asset.id === assetId && asset.previewPending)) return
    const previewKey = `${key}/preview`
    if (preview) await mediaStorage.put(previewKey, preview)
    try {
      const next = await changeProject(projectId, (project) => {
        if (!project) return undefined
        return {
          ...project,
          timeline: project.timeline.map((entry) => ({
            ...entry,
            media: entry.media.map((asset) => asset.id === assetId ? {
              ...asset,
              previewPending: false,
              ...(preview ? { preview: stored(previewKey) } : {}),
            } : asset),
          })),
        }
      })
      if (next) for (const listener of listeners) listener(next)
      // 생성 중 다른 탭에서 기록/작품을 삭제했을 수 있다. 참조된 파일은 로컬 cleanup이 보호한다.
      if (preview && !next?.timeline.some((entry) => entry.media.some((asset) => asset.id === assetId))) {
        await cleanup([previewKey])
      }
    } catch (error) {
      if (preview) await cleanup([previewKey])
      throw error
    }
  })
})

async function ingestFile(projectId: ID, file: File, warnings: string[]): Promise<MediaAsset | null> {
  const id = createId()
  const key = `${projectId}/${id}`
  const kind = detectMediaKind(file.type, file.name)
  const asset: MediaAsset = { id, kind, name: file.name, mimeType: file.type, size: file.size }

  try {
    const info = await DESCRIBERS[kind]?.(file)
    if (info) {
      asset.width = info.width
      asset.height = info.height
      asset.duration = info.duration
      if (info.thumbnail) {
        await mediaStorage.put(`${key}/thumbnail`, info.thumbnail)
        asset.thumbnail = stored(`${key}/thumbnail`)
      }
      if (info.display) {
        await mediaStorage.put(`${key}/display`, info.display)
        asset.display = stored(`${key}/display`)
      }
    }
  } catch {
    // 브라우저가 읽지 못하는 형식: 썸네일 없이 파일로만 보관한다
  }

  try {
    await mediaStorage.put(`${key}/original`, file)
    asset.original = stored(`${key}/original`)
  } catch (error) {
    if (!asset.thumbnail) {
      await cleanup(storedKeys([asset]))
      warnings.push(`「${file.name}」을 저장하지 못했습니다.`)
      return null
    }
    warnings.push(
      error instanceof StorageQuotaError
        ? `저장 공간이 부족해 「${file.name}」의 원본을 보관하지 못했습니다. 썸네일만 남습니다.`
        : `「${file.name}」의 원본을 저장하지 못했습니다. 썸네일만 남습니다.`,
    )
  }

  if (kind === 'video' && asset.original) asset.previewPending = true
  return asset
}

async function ingestFiles(
  projectId: ID,
  files: File[],
  onProgress: ProgressFn | undefined,
  warnings: string[],
): Promise<{ assets: MediaAsset[]; jobs: PreviewJob[] }> {
  if (files.length > 0) {
    void navigator.storage?.persist?.().catch((error) => console.warn('[archive] 영구 저장 권한 요청 실패', error))
  }
  const assets: MediaAsset[] = []
  const jobs: PreviewJob[] = []
  for (const [index, file] of files.entries()) {
    onProgress?.({ label: `${file.name} 저장 중`, current: index + 1, total: files.length })
    const asset = await ingestFile(projectId, file, warnings)
    if (!asset) continue
    assets.push(asset)
    if (asset.previewPending) jobs.push({ projectId, assetId: asset.id, source: file })
  }
  return { assets, jobs }
}

async function commit(
  id: ID,
  change: (current: Project | undefined) => Project,
  jobs: PreviewJob[] = [],
  assets: MediaAsset[] = [],
): Promise<Project> {
  let next: Project
  try {
    next = requireProject(await changeProject(id, (current) => ({ ...change(current), updatedAt: now() })))
  } catch (error) {
    await cleanup(storedKeys(assets))
    throw error
  }
  for (const job of jobs) enqueuePreview(job)
  return next
}

export const archiveService = {
  async load(): Promise<ArchiveSnapshot> {
    await cleanup()
    const snapshot = await repository.load()
    // 지난번에 끝내지 못한 Preview 생성을 이어서 한다. 원본을 다시 읽어야 하므로 큰 파일은 건너뛴다.
    for (const project of snapshot.projects) {
      for (const asset of allMedia(project)) {
        const resumable = asset.original?.type === 'stored' && asset.size <= REMOTE.previewResumeMaxBytes
        if (asset.previewPending && resumable) {
          enqueuePreview({ projectId: project.id, assetId: asset.id })
        }
      }
    }
    return snapshot
  },

  /** 백그라운드 작업(Preview 생성)이 프로젝트를 바꿨을 때 알린다. */
  subscribe(listener: (project: Project) => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  async saveCategory(draft: CategoryDraft, existing?: Category): Promise<Category> {
    const category: Category = existing
      ? { ...existing, ...draft }
      : { id: createId(), createdAt: now(), ...draft }
    await repository.saveCategory(category)
    return category
  },

  async removeCategory(id: ID): Promise<void> {
    const snapshot = await repository.load()
    if (snapshot.projects.some((project) => project.categoryId === id)) {
      throw new Error('창작물이 있는 성단은 지울 수 없습니다.')
    }
    return repository.deleteCategory(id)
  },

  async createProject(draft: ProjectDraft, files: File[], onProgress?: ProgressFn): Promise<SaveResult> {
    const id = createId()
    return withProject(id, async () => {
      const warnings: string[] = []
      const { assets, jobs } = await ingestFiles(id, files, onProgress, warnings)
      const { firstMemo, ...fields } = draft
      const firstEntry: TimelineEntry = {
        id: createId(),
        date: draft.startedAt,
        title: FIRST_ENTRY_TITLE,
        memo: firstMemo,
        version: '',
        tech: [],
        links: [],
        media: assets,
      }
      const hasFirstEntry = assets.length > 0 || firstMemo.trim() !== ''
      const project = await commit(
        id,
        () => ({
          ...fields,
          id,
          createdAt: now(),
          updatedAt: now(),
          coverMediaId: null,
          timeline: hasFirstEntry ? [firstEntry] : [],
        }),
        jobs,
        assets,
      )
      return { project, warnings }
    })
  },

  updateProject(project: Project, patch: ProjectPatch): Promise<Project> {
    return withProject(project.id, () => commit(project.id, (current) => ({ ...requireProject(current), ...patch })))
  },

  async removeProject(project: Project): Promise<void> {
    return withProject(project.id, async () => {
      const current = await repository.getProject(project.id)
      await repository.deleteProject(project.id)
      await cleanup(current ? storedKeys(allMedia(current)) : [])
    })
  },

  async saveEntry(project: Project, draft: EntryDraft, files: File[], onProgress?: ProgressFn): Promise<SaveResult> {
    return withProject(project.id, async () => {
      const warnings: string[] = []
      const { assets, jobs } = await ingestFiles(project.id, files, onProgress, warnings)
      let removed: MediaAsset[] = []
      const next = await commit(project.id, (current) => {
        const latestProject = requireProject(current)
        const previous = latestProject.timeline.find((entry) => entry.id === draft.id)
        if (draft.id && !previous) throw new Error('기록이 삭제되어 저장하지 못했습니다.')
        // 폼을 연 뒤 완료된 preview 등 파일 필드는 최신 저장값을 유지한다.
        const kept = draft.media.flatMap((asset) => {
          const latest = previous?.media.find((item) => item.id === asset.id)
          return latest ? [latest] : []
        })
        const { coverMediaId, ...entryFields } = draft
        const entry: TimelineEntry = { ...entryFields, id: draft.id ?? createId(), media: [...kept, ...assets] }
        const timeline = previous
          ? latestProject.timeline.map((item) => (item.id === entry.id ? entry : item))
          : [...latestProject.timeline, entry]

        const keptIds = new Set(entry.media.map((asset) => asset.id))
        removed = previous?.media.filter((asset) => !keptIds.has(asset.id)) ?? []
        const coverRemoved = removed.some((asset) => asset.id === latestProject.coverMediaId)
        const selectedCover = coverMediaId === undefined
          ? (coverRemoved ? null : latestProject.coverMediaId)
          : coverMediaId
        return {
          ...latestProject,
          timeline,
          coverMediaId: timeline.some((item) => item.media.some((asset) => asset.id === selectedCover)) ? selectedCover : null,
        }
      }, jobs, assets)
      await cleanup(storedKeys(removed))
      return { project: next, warnings }
    })
  },

  async removeEntry(project: Project, entryId: ID): Promise<Project> {
    return withProject(project.id, async () => {
      let removed: MediaAsset[] = []
      const next = await commit(project.id, (current) => {
        const latest = requireProject(current)
        const entry = latest.timeline.find((item) => item.id === entryId)
        if (!entry) return latest
        const coverRemoved = entry.media.some((asset) => asset.id === latest.coverMediaId)
        removed = entry.media
        return {
          ...latest,
          timeline: latest.timeline.filter((item) => item.id !== entryId),
          coverMediaId: coverRemoved ? null : latest.coverMediaId,
        }
      })
      await cleanup(storedKeys(removed))
      return next
    })
  },

  /** 미디어 위치를 화면에서 쓸 수 있는 주소로 바꾼다. */
  async resolveMediaUrl(source: MediaSource): Promise<string | undefined> {
    return source.type === 'url' ? source.url : mediaStorage.getUrl(source.key)
  },

  releaseMediaUrl(key: string, url: string): void {
    mediaStorage.releaseUrl?.(key, url)
  },

  async clearAll(): Promise<void> {
    const previous = clearing
    const draining = writes.drain()
    const operation = (async () => {
      await previous
      await draining
      await repository.clear()
      if (mediaStorage.retryCleanup) await cleanup()
      else await mediaStorage.clear()
    })()
    clearing = operation.catch(() => undefined)
    return operation
  },

  estimateStorage(): Promise<StorageEstimate | null> {
    return mediaStorage.estimate()
  },
}
