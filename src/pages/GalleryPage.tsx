import { Images } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ArchiveCard } from '@/components/ArchiveCard';
import { EmptyState } from '@/components/EmptyState';
import { TypeFilter } from '@/components/TypeFilter';
import { ITEM_TYPE_LIST, type ItemType } from '@/config/itemTypes';
import { useItemActions } from '@/hooks/useItemActions';
import { useItems } from '@/store/selectors';
import { byUpdatedDesc } from '@/utils/date';
import './pages.css';

const DEFAULT_TYPES = ITEM_TYPE_LIST.filter((type) => type.gallery).map((type) => type.id);

/** 사진 · 영상 · 게임처럼 눈으로 고르는 콘텐츠를 위한 격자 보기 */
export function GalleryPage() {
  const items = useItems();
  const { open } = useItemActions();
  const [types, setTypes] = useState<ReadonlySet<ItemType>>(new Set(DEFAULT_TYPES));

  const visible = useMemo(() => items.filter((item) => types.has(item.type)).sort(byUpdatedDesc), [items, types]);
  const counts = useMemo(() => {
    const result = new Map<ItemType, number>();
    for (const item of items) result.set(item.type, (result.get(item.type) ?? 0) + 1);
    return result;
  }, [items]);

  const toggle = (type: ItemType) =>
    setTypes((current) => {
      const next = new Set(current);
      if (!next.delete(type)) next.add(type);
      return next;
    });

  return (
    <div className="page">
      <div className="page__inner">
        <div className="page__toolbar">
          <TypeFilter isActive={(type) => types.has(type)} onToggle={toggle} counts={counts} />
        </div>
        {visible.length ? (
          <div className="card-grid">
            {visible.map((item) => (
              <ArchiveCard key={item.id} item={item} onClick={open} />
            ))}
          </div>
        ) : (
          <EmptyState icon={Images} title="표시할 항목이 없어요" description="위에서 보고 싶은 타입을 선택해 주세요" />
        )}
      </div>
    </div>
  );
}
