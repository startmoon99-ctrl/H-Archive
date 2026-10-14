/** 성단(카테고리) 색. hue 값만 저장하므로 목록에 없는 색도 쓸 수 있다. */
export const STAR_HUES = [
  { id: 'violet', label: 'Violet', hue: 285 },
  { id: 'blue', label: 'Blue', hue: 255 },
  { id: 'ice', label: 'Ice', hue: 220 },
  { id: 'teal', label: 'Teal', hue: 190 },
  { id: 'rose', label: 'Rose', hue: 350 },
  { id: 'amber', label: 'Amber', hue: 70 },
  { id: 'ember', label: 'Ember', hue: 35 },
  { id: 'mint', label: 'Mint', hue: 160 },
] as const

export const DEFAULT_STAR_HUE = STAR_HUES[0].hue

/** 같은 성단 안에서 프로젝트 색이 성단 색에서 벗어나는 최대 폭 */
export const PROJECT_HUE_SPREAD = 28

export const PROJECT_STATUSES = [
  { id: 'idea', label: '아이디어' },
  { id: 'in-progress', label: '진행 중' },
  { id: 'paused', label: '멈춤' },
  { id: 'complete', label: '완성' },
] as const

export type ProjectStatusId = (typeof PROJECT_STATUSES)[number]['id']

export const DEFAULT_PROJECT_STATUS: ProjectStatusId = 'in-progress'

export function statusLabel(id: ProjectStatusId): string {
  return PROJECT_STATUSES.find((status) => status.id === id)?.label ?? id
}

/** 새 프로젝트의 첫 기록에 붙는 기본 제목 */
export const FIRST_ENTRY_TITLE = '첫 기록'
