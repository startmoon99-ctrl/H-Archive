import { Clock } from 'lucide-react';
import { useMemo } from 'react';
import { ArchiveCard } from '@/components/ArchiveCard';
import { EmptyState } from '@/components/EmptyState';
import { useItemActions } from '@/hooks/useItemActions';
import { useItems } from '@/store/selectors';
import type { ArchiveItem } from '@/types/archive';
import { byUpdatedDesc, getRecencyGroup, RECENCY_GROUPS, type RecencyGroupId } from '@/utils/date';
import './pages.css';

export function RecentPage() {
  const items = useItems();
  const { open } = useItemActions();

  const groups = useMemo(() => {
    const byGroup = new Map<RecencyGroupId, ArchiveItem[]>();
    for (const item of [...items].sort(byUpdatedDesc)) {
      const group = getRecencyGroup(item.updatedAt);
      byGroup.set(group, [...(byGroup.get(group) ?? []), item]);
    }
    return RECENCY_GROUPS.flatMap((group) => {
      const groupItems = byGroup.get(group.id);
      return groupItems ? [{ ...group, items: groupItems }] : [];
    });
  }, [items]);

  if (!groups.length) {
    return <EmptyState icon={Clock} title="아직 기록이 없어요" />;
  }

  return (
    <div className="page">
      <div className="page__inner page__inner--narrow">
        {groups.map((group) => (
          <section key={group.id} className="page__section">
            <h2 className="section-label page__group-label">{group.label}</h2>
            <div className="row-list">
              {group.items.map((item) => (
                <ArchiveCard key={item.id} item={item} variant="row" onClick={open} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
