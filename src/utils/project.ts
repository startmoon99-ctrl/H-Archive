import { PROJECT_HUE_SPREAD } from '@/config/catalog'
import { MEDIA_KINDS } from '@/config/media'
import type { ISODate, MediaAsset, Project, TimelineEntry } from '@/types/archive'
import { hashString } from './random'

/** 이야기 순서(오래된 기록부터) */
export function sortTimeline(entries: TimelineEntry[]): TimelineEntry[] {
  return [...entries].sort((a, b) => a.date.localeCompare(b.date))
}

export function allMedia(project: Project): MediaAsset[] {
  return project.timeline.flatMap((entry) => entry.media)
}

export function isVisual(asset: MediaAsset): boolean {
  return MEDIA_KINDS[asset.kind].visual
}

/** 대표 미디어: 직접 고른 것 → 썸네일이 있는 첫 시각 자료 → 없음 */
export function findCover(project: Project): MediaAsset | undefined {
  const media = allMedia(project)
  return (
    media.find((asset) => asset.id === project.coverMediaId) ??
    media.find((asset) => isVisual(asset) && asset.thumbnail)
  )
}

export function lastActivity(project: Project): ISODate {
  return project.timeline.reduce((latest, entry) => (entry.date > latest ? entry.date : latest), project.startedAt)
}

/** 항성 색을 기준으로 프로젝트마다 조금씩 다른 색을 준다. id에서 계산하므로 저장하지 않는다. */
export function projectHue(project: Project, categoryHue: number): number {
  const offset = (hashString(project.id) % (PROJECT_HUE_SPREAD * 2 + 1)) - PROJECT_HUE_SPREAD
  return (categoryHue + offset + 360) % 360
}
