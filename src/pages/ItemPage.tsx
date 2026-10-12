import { ExternalLink, FileQuestion, Paperclip, Pencil, Waypoints } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { EmptyState } from '@/components/EmptyState';
import { TagChip } from '@/components/TagChip';
import { TypeBadge } from '@/components/TypeIcon';
import { ROUTES } from '@/config/navigation';
import { ContentRenderer } from '@/features/item/ContentRenderer';
import { ItemRelations } from '@/features/item/ItemRelations';
import { MediaViewer } from '@/features/item/MediaViewer';
import { useItemActions } from '@/hooks/useItemActions';
import { useLayout } from '@/hooks/useLayout';
import { useItem } from '@/store/selectors';
import { useUiStore } from '@/store/uiStore';
import { formatDate, formatRelative } from '@/utils/date';
import { toSafeUrl } from '@/utils/url';
import './pages.css';

export function ItemPage() {
  const { id } = useParams();
  const item = useItem(id);
  const layout = useLayout();
  const navigate = useNavigate();
  const actions = useItemActions();
  const select = useUiStore((state) => state.select);
  const openEditor = useUiStore((state) => state.openEditor);

  // 보고 있는 항목을 선택 상태로 맞춰 정보 패널 · 탐색기 · 그래프가 같은 항목을 가리키게 한다
  const itemId = item?.id;
  useEffect(() => {
    if (itemId) select(itemId);
  }, [itemId, select]);

  if (!item) {
    return (
      <EmptyState
        icon={FileQuestion}
        title="항목을 찾을 수 없어요"
        description="삭제되었거나 주소가 잘못되었을 수 있어요"
        action={
          <Link className="btn" to={ROUTES.graph}>
            그래프로 돌아가기
          </Link>
        }
      />
    );
  }

  const externalUrl = toSafeUrl(item.url);
  const attachments = (item.attachments ?? []).flatMap((attachment) => {
    const url = toSafeUrl(attachment.url);
    return url ? [{ ...attachment, url }] : [];
  });

  return (
    <div className="page">
      <article className="page__inner page__inner--reading item-page">
        <header className="item-page__header">
          <div className="item-page__meta">
            <TypeBadge type={item.type} />
            <span title={`만든 날 ${formatDate(item.createdAt)}`}>
              {formatDate(item.createdAt)} · {formatRelative(item.updatedAt)} 수정
            </span>
          </div>
          <h2 className="item-page__title">{item.title}</h2>
          {item.tags.length > 0 && (
            <div className="tag-list">
              {item.tags.map((tag) => (
                <TagChip key={tag} tag={tag} onClick={(value) => navigate(ROUTES.tag(value))} />
              ))}
            </div>
          )}
          <div className="item-page__actions">
            <button type="button" className="btn" onClick={() => openEditor({ itemId: item.id })}>
              <Pencil size={15} aria-hidden />
              편집
            </button>
            <button type="button" className="btn" onClick={() => actions.showInGraph(item.id)}>
              <Waypoints size={15} aria-hidden />
              그래프에서 보기
            </button>
            {externalUrl && (
              <a className="btn" href={externalUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={15} aria-hidden />새 탭에서 열기
              </a>
            )}
          </div>
        </header>

        <MediaViewer key={item.id} item={item} />

        {item.content.trim() && <ContentRenderer content={item.content} />}

        {attachments.length > 0 && (
          <section className="item-page__attachments">
            <h3 className="section-label">첨부 자료</h3>
            {attachments.map((attachment) => (
              <a key={attachment.id} className="btn" href={attachment.url} target="_blank" rel="noopener noreferrer">
                <Paperclip size={15} aria-hidden />
                {attachment.name}
              </a>
            ))}
          </section>
        )}

        {/* PC 는 오른쪽 정보 패널이 관계를 보여 준다. 좁은 화면에서는 본문 아래에 둔다. */}
        {layout !== 'desktop' && (
          <footer className="item-page__relations">
            <ItemRelations item={item} onPick={actions.open} />
          </footer>
        )}
      </article>
    </div>
  );
}
