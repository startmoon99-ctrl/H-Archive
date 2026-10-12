import { useEffect, useState } from 'react'
import { ImageOff, Play } from 'lucide-react'
import { MEDIA_KINDS, MEDIA_PROCESSING } from '@/config/media'
import { useInView } from '@/hooks/useInView'
import { selectActiveMotion, useMotionStore } from '@/store/motionStore'
import type { MediaAsset, MediaSource } from '@/types/archive'
import { cx } from '@/utils/css'
import { formatDuration } from '@/utils/format'
import { useMediaUrl } from './useMediaUrl'
import './media-preview.css'

/** 움직이는 미리보기로 쓸 가벼운 파일. 원본 영상은 여기에 절대 넣지 않는다. */
function previewSourceOf(asset: MediaAsset): MediaSource | undefined {
  if (asset.preview) return asset.preview
  if (asset.kind === 'gif' && asset.size <= MEDIA_PROCESSING.gifPreviewMaxBytes) return asset.original
  return undefined
}

interface MediaPreviewProps {
  asset: MediaAsset | undefined
  /**
   * 미리보기를 재생할지 밖에서 정한다(선택된 카드 등).
   * 주지 않으면 마우스를 올렸을 때 재생한다.
   */
  active?: boolean
  /**
   * 정지 이미지의 해상도. thumbnail: 은하 · 카드용(기본) / display: 상세 화면처럼 크게 보이는 곳.
   * display가 없는 자료는 썸네일로 대신한다.
   */
  detail?: 'thumbnail' | 'display'
  className?: string
}

/**
 * 썸네일 + (필요할 때만) 짧은 Preview.
 * 화면에 들어와야 썸네일을 불러오고, 화면 밖이거나 선택이 풀리면 Preview를 내린다.
 */
export function MediaPreview({ asset, active, detail = 'thumbnail', className }: MediaPreviewProps) {
  const [ref, inView] = useInView<HTMLDivElement>({ rootMargin: '240px' })
  const [seen, setSeen] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [playing, setPlaying] = useState(false)
  const autoplay = useMotionStore((state) => selectActiveMotion(state).previewAutoplay)

  useEffect(() => {
    if (inView) setSeen(true)
  }, [inView])

  const previewSource = asset && previewSourceOf(asset)
  const wantsPreview = Boolean(previewSource) && autoplay && inView && (active ?? hovered)
  const stillSource = (detail === 'display' && asset?.display) || asset?.thumbnail
  const thumbnailUrl = useMediaUrl(seen ? stillSource : undefined)
  const previewUrl = useMediaUrl(wantsPreview ? previewSource : undefined)

  useEffect(() => {
    if (!wantsPreview) setPlaying(false)
  }, [wantsPreview])

  const Icon = asset ? MEDIA_KINDS[asset.kind].icon : ImageOff

  return (
    <div
      ref={ref}
      className={cx('media-preview', className)}
      data-playing={playing}
      onPointerEnter={(event) => event.pointerType === 'mouse' && setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {thumbnailUrl ? (
        <img className="media-preview__layer" src={thumbnailUrl} alt="" decoding="async" draggable={false} />
      ) : (
        <div className="media-preview__fallback">
          <Icon aria-hidden="true" />
        </div>
      )}

      {wantsPreview &&
        previewUrl &&
        (asset?.kind === 'gif' ? (
          <img
            className="media-preview__layer media-preview__motion"
            src={previewUrl}
            alt=""
            draggable={false}
            onLoad={() => setPlaying(true)}
          />
        ) : (
          <video
            className="media-preview__layer media-preview__motion"
            src={previewUrl}
            muted
            loop
            playsInline
            autoPlay
            onPlaying={() => setPlaying(true)}
          />
        ))}

      {asset?.kind === 'video' && (
        <span className="media-preview__badge">
          <Play aria-hidden="true" />
          {asset.duration !== undefined && formatDuration(asset.duration)}
        </span>
      )}
      {asset?.previewPending && <span className="media-preview__badge" data-corner="end">미리보기 준비 중</span>}
    </div>
  )
}
