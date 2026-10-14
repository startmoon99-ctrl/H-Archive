import type { Category, MediaAsset, Project, TimelineEntry } from '@/types/archive'

export function categoryFixture(): Category {
  return { id: 'category', name: '성단', hue: 220, description: '', createdAt: '2026-01-01T00:00:00Z' }
}

export function entryFixture(media: MediaAsset[] = []): TimelineEntry {
  return { id: 'entry', date: '2026-01-01', title: '기록', memo: '', version: '', tech: [], links: [], media }
}

export function assetFixture(): MediaAsset {
  return {
    id: 'asset', kind: 'video', name: 'video.mp4', size: 3, mimeType: 'video/mp4',
    original: { type: 'stored', key: 'project/asset/original' }, previewPending: true,
  }
}

export function projectFixture(media: MediaAsset[] = []): Project {
  return {
    id: 'project', categoryId: 'category', title: '이전 제목', description: '',
    status: 'in-progress', startedAt: '2026-01-01', createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z', coverMediaId: null, tags: [], links: [],
    timeline: [entryFixture(media)],
  }
}

export function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
