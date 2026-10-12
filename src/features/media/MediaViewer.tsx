import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight, Download, X } from 'lucide-react'
import { IconButton } from '@/components/Button'
import { MEDIA_KINDS, type MediaKind } from '@/config/media'
import type { MediaAsset } from '@/types/archive'
import { formatBytes } from '@/utils/format'
import { useMediaUrl } from './useMediaUrl'
import './media-viewer.css'

interface ViewProps {
  asset: MediaAsset
  url: string
}

function ImageView({ asset, url }: ViewProps) {
  return <img className="viewer__media" src={url} alt={asset.name} />
}

function VideoView({ url }: ViewProps) {
  return <video className="viewer__media" src={url} controls autoPlay playsInline />
}

function AudioView({ asset, url }: ViewProps) {
  return (
    <div className="viewer__file">
      <FileSummary asset={asset} />
      <audio src={url} controls autoPlay />
    </div>
  )
}

function FileView({ asset, url }: ViewProps) {
  return (
    <div className="viewer__file">
      <FileSummary asset={asset} />
      <a className="viewer__download" href={url} download={asset.name} target="_blank" rel="noreferrer">
        <Download aria-hidden="true" />
        열기 · 내려받기
      </a>
    </div>
  )
}

function FileSummary({ asset }: { asset: MediaAsset }) {
  const { icon: Icon, label } = MEDIA_KINDS[asset.kind]
  return (
    <>
      <Icon className="viewer__file-icon" aria-hidden="true" />
      <p className="viewer__file-name">{asset.name}</p>
      <p className="eyebrow">
        {label} · {formatBytes(asset.size)}
      </p>
    </>
  )
}

/** 미디어 종류별 표시 방식. 원본은 여기서 열 때만 불러온다. */
const VIEWERS: Record<MediaKind, (props: ViewProps) => ReactNode> = {
  image: ImageView,
  gif: ImageView,
  video: VideoView,
  audio: AudioView,
  document: FileView,
  file: FileView,
}

const SWIPE_DISTANCE = 60

interface MediaViewerProps {
  items: MediaAsset[]
  index: number
  onClose: () => void
}

export function MediaViewer({ items, index: initialIndex, onClose }: MediaViewerProps) {
  const [index, setIndex] = useState(initialIndex)
  const swipeStart = useRef<number | null>(null)
  const asset = items[index]
  const url = useMediaUrl(asset?.original ?? asset?.thumbnail)
  const hasMany = items.length > 1

  const step = (delta: number) => setIndex((current) => (current + delta + items.length) % items.length)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') setIndex((current) => (current - 1 + items.length) % items.length)
      if (event.key === 'ArrowRight') setIndex((current) => (current + 1) % items.length)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [items.length])

  if (!asset) return null
  const View = VIEWERS[asset.kind]

  return (
    <div
      className="viewer"
      onPointerDown={(event) => {
        swipeStart.current = event.pointerType === 'touch' ? event.clientX : null
      }}
      onPointerUp={(event) => {
        if (swipeStart.current === null || !hasMany) return
        const distance = event.clientX - swipeStart.current
        if (Math.abs(distance) > SWIPE_DISTANCE) step(distance < 0 ? 1 : -1)
        swipeStart.current = null
      }}
    >
      <header className="viewer__bar">
        <p className="viewer__caption">
          {asset.name}
          {hasMany && (
            <span className="eyebrow">
              {index + 1} / {items.length}
            </span>
          )}
        </p>
        <IconButton icon={X} label="닫기" data-autofocus onClick={onClose} />
      </header>

      <div className="viewer__stage" key={asset.id}>
        {url ? <View asset={asset} url={url} /> : <p className="eyebrow">원본이 보관되어 있지 않습니다</p>}
      </div>

      {hasMany && (
        <>
          <IconButton className="viewer__nav" data-side="prev" icon={ChevronLeft} label="이전" onClick={() => step(-1)} />
          <IconButton className="viewer__nav" data-side="next" icon={ChevronRight} label="다음" onClick={() => step(1)} />
        </>
      )}
    </div>
  )
}
