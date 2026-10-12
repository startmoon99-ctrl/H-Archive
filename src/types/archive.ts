import type { ProjectStatusId } from '@/config/catalog'
import type { MediaKind } from '@/config/media'

export type ID = string
/** YYYY-MM-DD */
export type ISODate = string
export type ISODateTime = string

/** 항성계 */
export interface Category {
  id: ID
  name: string
  description: string
  hue: number
  createdAt: ISODateTime
}

export interface LinkRef {
  id: ID
  label: string
  url: string
}

/** 파일의 위치. stored는 MediaStorage의 key, url은 외부 · 내장 주소다. */
export type MediaSource = { type: 'stored'; key: string } | { type: 'url'; url: string }

export interface MediaAsset {
  id: ID
  kind: MediaKind
  name: string
  mimeType: string
  size: number
  width?: number
  height?: number
  /** 초 */
  duration?: number
  /** 원본. 상세 화면에서 직접 열 때만 불러온다. */
  original?: MediaSource
  /** 은하와 카드용의 작은 이미지 */
  thumbnail?: MediaSource
  /** 상세 화면 · 갤러리용의 고해상도 이미지. 없으면 썸네일을 쓴다. */
  display?: MediaSource
  /** 짧고 가벼운 미리보기 영상 */
  preview?: MediaSource
  /** Preview 생성이 아직 끝나지 않았다 */
  previewPending?: boolean
}

/** 개발 기록 한 건: 그때 무엇을 만들었고 무슨 생각을 했는지 */
export interface TimelineEntry {
  id: ID
  date: ISODate
  title: string
  memo: string
  version: string
  tech: string[]
  links: LinkRef[]
  media: MediaAsset[]
}

export interface Project {
  id: ID
  title: string
  categoryId: ID
  description: string
  status: ProjectStatusId
  startedAt: ISODate
  createdAt: ISODateTime
  updatedAt: ISODateTime
  coverMediaId: ID | null
  tags: string[]
  links: LinkRef[]
  timeline: TimelineEntry[]
}

export interface ArchiveSnapshot {
  categories: Category[]
  projects: Project[]
}
