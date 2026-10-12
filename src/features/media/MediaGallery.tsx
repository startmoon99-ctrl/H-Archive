import { MEDIA_KINDS } from '@/config/media'
import { useUiStore } from '@/store/uiStore'
import type { MediaAsset } from '@/types/archive'
import { formatBytes } from '@/utils/format'
import { isVisual } from '@/utils/project'
import { MediaPreview } from './MediaPreview'
import './media-gallery.css'

/** 한 기록에 붙은 미디어. 이미지 · 영상은 격자로, 그 밖의 파일은 목록으로 보여준다. 누르면 원본을 연다. */
export function MediaGallery({ assets }: { assets: MediaAsset[] }) {
  const openDialog = useUiStore((state) => state.openDialog)
  if (assets.length === 0) return null

  const open = (asset: MediaAsset) => openDialog({ type: 'viewer', items: assets, index: assets.indexOf(asset) })
  const visuals = assets.filter(isVisual)
  const files = assets.filter((asset) => !isVisual(asset))

  return (
    <div className="gallery">
      {visuals.length > 0 && (
        <div className="gallery__grid" data-count={Math.min(visuals.length, 3)}>
          {visuals.map((asset) => (
            <button
              key={asset.id}
              type="button"
              className="gallery__item"
              aria-label={`${asset.name} 크게 보기`}
              onClick={() => open(asset)}
            >
              <MediaPreview asset={asset} detail="display" />
            </button>
          ))}
        </div>
      )}
      {files.map((asset) => {
        const { icon: Icon, label } = MEDIA_KINDS[asset.kind]
        return (
          <button key={asset.id} type="button" className="gallery__file" onClick={() => open(asset)}>
            <Icon aria-hidden="true" />
            <span className="gallery__file-name">{asset.name}</span>
            <span className="gallery__file-meta">
              {label} · {formatBytes(asset.size)}
            </span>
          </button>
        )
      })}
    </div>
  )
}
