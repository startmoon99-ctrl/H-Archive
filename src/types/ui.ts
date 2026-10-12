import type { ID, MediaAsset } from './archive'

/** 한 번에 하나만 열리는 대화상자. 내용은 features/dialogs/DialogHost가 고른다. */
export type DialogDescriptor =
  | { type: 'search' }
  | { type: 'settings' }
  /** projectId가 있으면 편집, 없으면 새 창작물 */
  | { type: 'project'; projectId?: ID; categoryId?: ID }
  /** entryId가 있으면 편집, 없으면 새 기록 */
  | { type: 'entry'; projectId: ID; entryId?: ID }
  | { type: 'category'; categoryId?: ID }
  | { type: 'viewer'; items: MediaAsset[]; index: number }

export type IntroPhase = 'playing' | 'revealing' | 'done'

export interface Point {
  x: number
  y: number
}

export interface Toast {
  id: ID
  message: string
  tone: 'info' | 'warning'
}
