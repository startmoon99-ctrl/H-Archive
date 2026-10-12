import { Hash } from 'lucide-react';
import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router';
import { ArchiveCard } from '@/components/ArchiveCard';
import { EmptyState } from '@/components/EmptyState';
import { TagChip } from '@/components/TagChip';
import { ROUTES } from '@/config/navigation';
import { useItemActions } from '@/hooks/useItemActions';
import { useItems } from '@/store/selectors';
import { byUpdatedDesc } from '@/utils/date';
import { getTagCounts } from '@/utils/tags';
import './pages.css';

export function TagsPage() {
  const { tag: activeTag } = useParams();
  const navigate = useNavigate();
  const items = useItems();
  const { open } = useItemActions();

  const tags = useMemo(() => getTagCounts(items), [items]);
  const tagged = useMemo(
    () => (activeTag ? items.filter((item) => item.tags.includes(activeTag)).sort(byUpdatedDesc) : []),
    [items, activeTag],
  );

  if (!tags.length) {
    return <EmptyState icon={Hash} title="아직 태그가 없어요" description="항목에 태그를 달면 여기에 모여요" />;
  }

  return (
    <div className="page">
      <div className="page__inner">
        <div className="tag-list tag-cloud">
          {tags.map(({ tag, count }) => (
            <TagChip
              key={tag}
              tag={tag}
              count={count}
              active={tag === activeTag}
              // 같은 태그를 다시 누르면 선택을 해제한다
              onClick={(value) => navigate(value === activeTag ? ROUTES.tags : ROUTES.tag(value), { replace: true })}
            />
          ))}
        </div>

        {activeTag ? (
          <section className="page__section" key={activeTag}>
            <h2 className="page__heading">
              #{activeTag} <span className="count-badge">{tagged.length}</span>
            </h2>
            {tagged.length ? (
              <div className="card-grid">
                {tagged.map((item) => (
                  <ArchiveCard key={item.id} item={item} onClick={open} />
                ))}
              </div>
            ) : (
              <EmptyState title="이 태그를 가진 항목이 없어요" />
            )}
          </section>
        ) : (
          <EmptyState icon={Hash} title="태그를 선택해 보세요" description="같은 태그를 가진 기록을 타입에 상관없이 모아 볼 수 있어요" />
        )}
      </div>
    </div>
  );
}
