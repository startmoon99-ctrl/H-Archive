import { Play } from 'lucide-react';
import { getItemType } from '@/config/itemTypes';
import type { ArchiveItem } from '@/types/archive';
import { formatRelative } from '@/utils/date';
import { getExcerpt } from '@/utils/text';
import { CoverImage } from './CoverImage';
import { TypeIcon } from './TypeIcon';
import './ArchiveCard.css';

const PLAYABLE_MEDIA = new Set(['video', 'embed']);

interface ArchiveCardProps {
  item: ArchiveItem;
  variant?: 'card' | 'row';
  onClick(id: string): void;
}

export function ArchiveCard({ item, variant = 'card', onClick }: ArchiveCardProps) {
  const type = getItemType(item.type);
  const excerpt = getExcerpt(item.content);

  if (variant === 'row') {
    return (
      <button type="button" className="archive-row" onClick={() => onClick(item.id)}>
        <TypeIcon type={item.type} boxed />
        <span className="archive-row__text">
          <span className="archive-row__title">{item.title}</span>
          {excerpt && <span className="archive-row__excerpt">{excerpt}</span>}
        </span>
        <time className="archive-row__time" dateTime={item.updatedAt}>
          {formatRelative(item.updatedAt)}
        </time>
      </button>
    );
  }

  const hasVisual = Boolean(item.thumbnail) || type.gallery;

  return (
    <button type="button" className="archive-card" onClick={() => onClick(item.id)}>
      <span className="archive-card__media">
        {hasVisual ? (
          <CoverImage item={item} className="archive-card__image" />
        ) : (
          <span className="archive-card__preview">{excerpt || type.label}</span>
        )}
        {PLAYABLE_MEDIA.has(type.media) && (
          <span className="archive-card__play">
            <Play size={16} fill="currentColor" aria-hidden />
          </span>
        )}
      </span>
      <span className="archive-card__body">
        <TypeIcon type={item.type} size={14} />
        <span className="archive-card__title">{item.title}</span>
      </span>
    </button>
  );
}
