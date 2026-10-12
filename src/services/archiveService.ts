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
import { allMedia } from '@/utils/project'
import { createSerialQueue } from '@/utils/serialQueue'
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

function now(): string {
  return new Date().toISOString()
}

function stored(key: string): MediaSource {
  return { type: 'stored', key }
}

function storedKeys(assets: MediaAsset[]): string[] {
  return assets
    .flatMap((asset) => [asset.original, asset.thumbnail, asset.display, asset.preview])
    .flatMap((source) => (source?.type === 'stored' ? [source.key] : []))
}

async function patchAsset(projectId: ID, assetId: ID, patch: Partial<MediaAsset>): Promise<void> {
  const project = await repository.getProject(projectId)
  if (!project) return
  const next: Project = {
    ...project,
    timeline: project.timeline.map((entry) => ({
      ...entry,
      media: entry.media.map((asset) => (asset.id === assetId ? { ...asset, ...patch } : asset)),
    })),
  }
  await repository.saveProject(next)
  for (const listener of listeners) listener(next)
}

const enqueuePreview = createSerialQueue<PreviewJob>(async ({ projectId, assetId, source }) => {
  const key = `${projectId}/${assetId}`
  let preview: Blob | null = null
  try {
    const original = source ?? (await mediaStorage.getBlob(`${key}/original`))
    preview = original ? await createVideoPreview(original) : null
    if (preview) await mediaStorage.put(`${key}/preview`, preview)
  } finally {
    // 실패해도 대기 표시는 지운다(썸네일만으로 동작한다)
    await patchAsset(projectId, assetId, {
      previewPending: false,
      ...(preview ? { preview: stored(`${key}/preview`) } : {}),
    })
  }
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
      warnings.push(`「${file.name}」을 저장하지 못했습니다.`)
      return null
    }
    warnings.push(
      error instanceof StorageQuotaError
        ? `저장 공간이 부족해 「${file.name}」의 원본을 보관하지 못했습니다. 썸네일만 남습니다.`
        : `「${file.name}」의 원본을 저장하지 못했습니다. 썸네일만 남습니다.`,
    )
  }

  if (kind === 'video') asset.previewPending = true
  return asset
}

async function ingestFiles(
  projectId: ID,
  files: File[],
  onProgress: ProgressFn | undefined,
  warnings: string[],
): Promise<{ assets: MediaAsset[]; jobs: PreviewJob[] }> {
  if (files.length > 0) void navigator.storage?.persist?.()
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

async function commit(project: Project, jobs: PreviewJob[] = []): Promise<Project> {
  const next = { ...project, updatedAt: now() }
  await repository.saveProject(next)
  for (const job of jobs) enqueuePreview(job)
  return next
}

export const archiveService = {
  async load(): Promise<ArchiveSnapshot> {
    const snapshot = await repository.load()
    // 지난번에 끝내지 못한 Preview 생성을 이어서 한다
    for (const project of snapshot.projects) {
      for (const asset of allMedia(project)) {
        if (asset.previewPending && asset.original?.type === 'stored') {
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

  removeCategory(id: ID): Promise<void> {
    return repository.deleteCategory(id)
  },

  async createProject(draft: ProjectDraft, files: File[], onProgress?: ProgressFn): Promise<SaveResult> {
    const id = createId()
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
      {
        ...fields,
        id,
        createdAt: now(),
        updatedAt: now(),
        coverMediaId: null,
        timeline: hasFirstEntry ? [firstEntry] : [],
      },
      jobs,
    )
    return { project, warnings }
  },

  updateProject(project: Project, patch: ProjectPatch): Promise<Project> {
    return commit({ ...project, ...patch })
  },

  async removeProject(project: Project): Promise<void> {
    await repository.deleteProject(project.id)
    await mediaStorage.remove(storedKeys(allMedia(project)))
  },

  async saveEntry(project: Project, draft: EntryDraft, files: File[], onProgress?: ProgressFn): Promise<SaveResult> {
    const warnings: string[] = []
    const { assets, jobs } = await ingestFiles(project.id, files, onProgress, warnings)
    const previous = project.timeline.find((entry) => entry.id === draft.id)
    const entry: TimelineEntry = { ...draft, id: draft.id ?? createId(), media: [...draft.media, ...assets] }
    const timeline = previous
      ? project.timeline.map((item) => (item.id === entry.id ? entry : item))
      : [...project.timeline, entry]

    const keptIds = new Set(entry.media.map((asset) => asset.id))
    const removed = previous?.media.filter((asset) => !keptIds.has(asset.id)) ?? []
    const coverRemoved = removed.some((asset) => asset.id === project.coverMediaId)

    const next = await commit(
      { ...project, timeline, coverMediaId: coverRemoved ? null : project.coverMediaId },
      jobs,
    )
    await mediaStorage.remove(storedKeys(removed))
    return { project: next, warnings }
  },

  async removeEntry(project: Project, entryId: ID): Promise<Project> {
    const entry = project.timeline.find((item) => item.id === entryId)
    if (!entry) return project
    const coverRemoved = entry.media.some((asset) => asset.id === project.coverMediaId)
    const next = await commit({
      ...project,
      timeline: project.timeline.filter((item) => item.id !== entryId),
      coverMediaId: coverRemoved ? null : project.coverMediaId,
    })
    await mediaStorage.remove(storedKeys(entry.media))
    return next
  },

  /** 미디어 위치를 화면에서 쓸 수 있는 주소로 바꾼다. */
  async resolveMediaUrl(source: MediaSource): Promise<string | undefined> {
    return source.type === 'url' ? source.url : mediaStorage.getUrl(source.key)
  },

  async clearAll(): Promise<void> {
    await repository.clear()
    await mediaStorage.clear()
  },

  estimateStorage(): Promise<StorageEstimate | null> {
    return mediaStorage.estimate()
  },
}
