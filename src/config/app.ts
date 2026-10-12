export const APP = {
  name: 'H ARCHIVE',
  tagline: 'MY CREATIVE HISTORY',
} as const

/** localStorage에는 소량의 설정만 둔다. Archive 데이터는 저장소 계층(services/storage)이 맡는다. */
export const STORAGE_KEYS = {
  motion: 'h-archive:motion',
  introSeen: 'h-archive:intro-seen',
} as const

export const ARCHIVE_DB = {
  name: 'h-archive-galaxy',
  version: 1,
  stores: {
    categories: 'categories',
    projects: 'projects',
    files: 'files',
    meta: 'meta',
  },
} as const

export const LIMITS = {
  searchResults: 12,
  recentProjects: 6,
  toastMs: 5200,
} as const
