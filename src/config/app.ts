export const APP = {
  name: 'H ARCHIVE',
  tagline: 'MY CREATIVE HISTORY',
} as const

/** localStorage에는 소량의 설정만 둔다. Archive 데이터는 저장소 계층(services/storage)이 맡는다. */
export const STORAGE_KEYS = {
  motion: 'h-archive:motion',
  sound: 'h-archive:sound',
  /** 직접 옮긴 성단의 자리(이 브라우저에만 저장) */
  placements: 'h-archive:placements',
} as const

export const ARCHIVE_DB = {
  name: 'h-archive-galaxy',
  /** 올릴 때는 services/storage/local/db.ts의 MIGRATIONS에 같은 번호의 변경을 더한다 */
  version: 1,
  stores: {
    categories: 'categories',
    projects: 'projects',
    files: 'files',
    meta: 'meta',
  },
} as const

/**
 * 원격 저장소(Supabase)의 이름과 업로드 규칙. 테이블 · 버킷 이름은 supabase/schema.sql과 같아야 한다.
 * 접속 주소와 키는 코드가 아니라 환경 변수(.env.local, Vercel)에 둔다.
 */
export const REMOTE = {
  tables: { categories: 'categories', projects: 'projects' },
  bucket: 'media',
  /** 파일 주소의 유효 시간과, 만료 전에 미리 새로 받는 여유(초) */
  signedUrlSeconds: 3600,
  signedUrlRefreshSeconds: 600,
  /** 이 크기를 넘는 파일은 끊겨도 이어 올리는 방식(resumable)으로 보낸다 */
  resumableThresholdBytes: 6 * 1024 * 1024,
  resumableChunkBytes: 6 * 1024 * 1024,
  resumableRetryDelaysMs: [0, 3000, 5000, 10000, 20000],
  /** 다른 기기에서 영상 Preview를 다시 만들기 위해 원본을 내려받는 최대 크기 */
  previewResumeMaxBytes: 200 * 1024 * 1024,
} as const

export const LIMITS = {
  searchResults: 12,
  recentProjects: 6,
  toastMs: 5200,
} as const
