import { File, FileText, Film, Image, ImagePlay, Music, type LucideIcon } from 'lucide-react'

interface MediaKindConfig {
  label: string
  icon: LucideIcon
  /** MIME 접두어 */
  mime: string[]
  extensions: string[]
  /** 썸네일로 화면에 보여줄 수 있는 종류인가 */
  visual: boolean
}

/**
 * 미디어 종류. 위에서부터 차례로 판별하므로 구체적인 것(gif)을 먼저 둔다.
 * 종류를 추가하면 판별 · 아이콘 · 라벨이 함께 따라온다. 새 표시 방식이 필요할 때만
 * features/media/MediaViewer.tsx의 VIEWERS에 렌더러를 더한다.
 */
export const MEDIA_KINDS = {
  gif: { label: 'GIF', icon: ImagePlay, mime: ['image/gif'], extensions: ['gif'], visual: true },
  image: {
    label: '이미지',
    icon: Image,
    mime: ['image/'],
    extensions: ['png', 'jpg', 'jpeg', 'webp', 'avif', 'svg', 'bmp'],
    visual: true,
  },
  video: {
    label: '영상',
    icon: Film,
    mime: ['video/'],
    extensions: ['mp4', 'mov', 'webm', 'mkv', 'avi', 'm4v'],
    visual: true,
  },
  audio: {
    label: '음악',
    icon: Music,
    mime: ['audio/'],
    extensions: ['mp3', 'wav', 'flac', 'm4a', 'ogg', 'aac'],
    visual: false,
  },
  document: {
    label: '문서',
    icon: FileText,
    mime: ['application/pdf', 'text/', 'application/msword', 'application/vnd.'],
    extensions: ['pdf', 'md', 'txt', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'hwp', 'hwpx'],
    visual: false,
  },
  file: { label: '파일', icon: File, mime: [], extensions: [], visual: false },
} satisfies Record<string, MediaKindConfig>

export type MediaKind = keyof typeof MEDIA_KINDS

const FALLBACK_KIND: MediaKind = 'file'

export function detectMediaKind(mimeType: string, fileName: string): MediaKind {
  const extension = fileName.split('.').pop()?.toLowerCase() ?? ''
  const kinds = Object.entries(MEDIA_KINDS) as [MediaKind, MediaKindConfig][]
  const byMime = mimeType && kinds.find(([, kind]) => kind.mime.some((prefix) => mimeType.startsWith(prefix)))
  if (byMime) return byMime[0]
  return kinds.find(([, kind]) => kind.extensions.includes(extension))?.[0] ?? FALLBACK_KIND
}

/** 정지 이미지 한 단계의 생성 규칙 */
export interface StillTier {
  maxEdge: number
  type: string
  quality: number
}

/**
 * 썸네일 · 큰 화면용 이미지 · 영상 Preview 생성 규칙.
 * - thumbnail: 공간의 작품과 카드가 쓰는 가벼운 이미지
 * - display: 상세 화면과 갤러리가 쓰는 고해상도 이미지. 4K 화면에서도 선명하도록 크게 만든다.
 * - 원본: 손대지 않고 보관하며, 크게 보기에서만 불러온다.
 */
export const MEDIA_PROCESSING = {
  thumbnail: { maxEdge: 720, type: 'image/webp', quality: 0.82 } satisfies StillTier,
  display: { maxEdge: 2560, type: 'image/webp', quality: 0.92 } satisfies StillTier,
  /** 원본이 썸네일보다 이 배율 이상 클 때만 display를 따로 만든다 */
  displayMinGain: 1.25,
  /** 영상 대표 장면을 뽑는 위치 */
  poster: { seekRatio: 0.12, maxSeekSeconds: 3 },
  preview: {
    seconds: 8,
    maxHeight: 720,
    fps: 24,
    bitsPerSecond: 1_200_000,
    mimeCandidates: ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'],
    timeoutMs: 40_000,
  },
  /** 이 크기 이하의 GIF는 원본을 그대로 Preview로 쓴다 */
  gifPreviewMaxBytes: 12 * 1024 * 1024,
} as const
