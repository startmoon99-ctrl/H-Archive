import { ExternalLink, Play, X } from 'lucide-react';
import { useState, type ComponentType } from 'react';
import { CoverImage } from '@/components/CoverImage';
import { IconButton } from '@/components/IconButton';
import { Modal } from '@/components/Modal';
import { getItemType, type MediaKind } from '@/config/itemTypes';
import type { ArchiveItem } from '@/types/archive';
import { getEmbedSandbox, getHostname, getYouTubeId, toSafeImageSrc, toSafeUrl } from '@/utils/url';
import './item.css';

interface MediaProps {
  item: ArchiveItem;
}

function MediaNotice({ item, message }: MediaProps & { message: string }) {
  return (
    <div className="media media--frame">
      <CoverImage item={item} className="media__cover" />
      <p className="media__notice">{message}</p>
    </div>
  );
}

function ImageMedia({ item }: MediaProps) {
  const [zoomed, setZoomed] = useState(false);
  return (
    <>
      <button type="button" className="media media--image" aria-label="크게 보기" onClick={() => setZoomed(true)}>
        <CoverImage item={item} alt={item.title} />
      </button>
      <Modal open={zoomed} onClose={() => setZoomed(false)} label={item.title} variant="lightbox">
        <div className="lightbox" onClick={() => setZoomed(false)}>
          <CoverImage item={item} alt={item.title} className="lightbox__image" />
          <IconButton icon={X} label="닫기" className="lightbox__close" data-autofocus />
        </div>
      </Modal>
    </>
  );
}

function VideoMedia({ item }: MediaProps) {
  const [failed, setFailed] = useState(false);
  const url = toSafeUrl(item.url);
  const youTubeId = getYouTubeId(url);

  if (!url) return <MediaNotice item={item} message="영상 주소를 추가하면 여기에서 바로 재생할 수 있어요" />;
  if (failed) return <MediaNotice item={item} message="영상을 불러오지 못했어요. 주소를 확인해 주세요" />;

  return (
    <div className="media media--frame">
      {youTubeId ? (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(youTubeId)}`}
          title={item.title}
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
        />
      ) : (
        <video
          src={url}
          poster={toSafeImageSrc(item.thumbnail) ?? undefined}
          controls
          playsInline
          preload="metadata"
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

function EmbedMedia({ item }: MediaProps) {
  const [playing, setPlaying] = useState(false);
  const url = toSafeUrl(item.url);

  if (!url) return <MediaNotice item={item} message="게임 주소를 추가하면 여기에서 바로 플레이할 수 있어요" />;

  return (
    <div className="media media--frame">
      {playing ? (
        <iframe src={url} title={item.title} sandbox={getEmbedSandbox(url)} />
      ) : (
        <button type="button" className="media__start" onClick={() => setPlaying(true)}>
          <CoverImage item={item} className="media__cover" />
          <span className="media__play">
            <Play size={22} fill="currentColor" aria-hidden />
            플레이
          </span>
        </button>
      )}
    </div>
  );
}

function LinkMedia({ item }: MediaProps) {
  const url = toSafeUrl(item.url);
  if (!url) return null;
  return (
    <a className="media media--link" href={url} target="_blank" rel="noopener noreferrer">
      <span className="media__link-text">
        <strong>{getHostname(url) ?? item.title}</strong>
        <span>{url}</span>
      </span>
      <ExternalLink size={18} aria-hidden />
    </a>
  );
}

/** 미디어 형태별 렌더러. 새 MediaKind 는 여기에 한 줄 추가한다. */
const MEDIA_RENDERERS: Record<MediaKind, ComponentType<MediaProps> | null> = {
  none: null,
  image: ImageMedia,
  video: VideoMedia,
  embed: EmbedMedia,
  link: LinkMedia,
};

export function MediaViewer({ item }: MediaProps) {
  const Renderer = MEDIA_RENDERERS[getItemType(item.type).media];
  if (Renderer) return <Renderer item={item} />;
  // 미디어 타입이 아니어도 커버 이미지를 넣었다면 보여 준다
  return item.thumbnail ? <ImageMedia item={item} /> : null;
}
