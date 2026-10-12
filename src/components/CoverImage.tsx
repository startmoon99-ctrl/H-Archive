import { useMemo, useState } from 'react';
import type { ArchiveItem } from '@/types/archive';
import { createPlaceholderCover } from '@/utils/cover';
import { toSafeImageSrc } from '@/utils/url';

interface CoverImageProps {
  item: ArchiveItem;
  className?: string;
  alt?: string;
}

/** 썸네일이 없거나 불러오지 못하면 생성형 커버로 대체한다 */
export function CoverImage({ item, className, alt = '' }: CoverImageProps) {
  const fallback = useMemo(() => createPlaceholderCover(`${item.type}:${item.id}`), [item.id, item.type]);
  const src = toSafeImageSrc(item.thumbnail);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  return (
    <img
      className={className}
      src={src && src !== failedSrc ? src : fallback}
      alt={alt}
      loading="lazy"
      draggable={false}
      onError={() => src && setFailedSrc(src)}
    />
  );
}
