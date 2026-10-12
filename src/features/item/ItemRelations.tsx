import { Plus, Unlink, X } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { IconButton } from '@/components/IconButton';
import { ItemRow } from '@/components/ItemRow';
import { LIMITS } from '@/config/app';
import { useArchiveStore } from '@/store/archiveStore';
import { useItemMap, useItems, useLinkIndex } from '@/store/selectors';
import { toast } from '@/store/toastStore';
import type { ArchiveItem } from '@/types/archive';
import { getRelatedIds } from '@/utils/links';
import { ItemSearchSelect } from './ItemSearchSelect';
import './item.css';

interface RelationSectionProps {
  title: string;
  count: number;
  emptyText: string;
  action?: ReactNode;
  children: ReactNode;
}

function RelationSection({ title, count, emptyText, action, children }: RelationSectionProps) {
  return (
    <section className="relations__section">
      <header className="relations__header">
        <h3 className="section-label">{title}</h3>
        <span className="count-badge">{count}</span>
        {action && <span className="relations__action">{action}</span>}
      </header>
      {children}
      {count === 0 && <p className="relations__empty">{emptyText}</p>}
    </section>
  );
}

interface ItemRelationsProps {
  item: ArchiveItem;
  /** 목록에서 항목을 눌렀을 때의 동작 (선택만 / 상세로 이동) */
  onPick(id: string): void;
}

/** 연결된 항목 · 백링크 · 관련 항목. 정보 패널과 상세 화면이 함께 쓴다. */
export function ItemRelations({ item, onPick }: ItemRelationsProps) {
  const items = useItems();
  const itemMap = useItemMap();
  const index = useLinkIndex();
  const updateItem = useArchiveStore((state) => state.updateItem);
  const [adding, setAdding] = useState(false);

  const resolve = (ids: string[] = []) => ids.flatMap((id) => itemMap.get(id) ?? []);
  const outgoing = resolve(index.outgoing.get(item.id));
  const backlinks = resolve(index.backlinks.get(item.id));
  const related = useMemo(
    () => getRelatedIds(item, items, index, LIMITS.relatedItems).flatMap((id) => itemMap.get(id) ?? []),
    [item, items, index, itemMap],
  );

  const excludeIds = useMemo(() => new Set([item.id, ...(index.outgoing.get(item.id) ?? [])]), [item.id, index]);
  // 본문 위키링크로 생긴 연결은 본문을 고쳐야 끊을 수 있다
  const explicitLinks = new Set(item.links);

  const addLink = (id: string) => {
    void updateItem(item.id, { links: [...item.links, id] });
    setAdding(false);
  };
  const removeLink = async (id: string) => {
    const updated = await updateItem(item.id, { links: item.links.filter((link) => link !== id) });
    if (updated) toast('연결을 끊었어요');
  };

  return (
    <div className="relations">
      <RelationSection
        title="연결된 항목"
        count={outgoing.length}
        emptyText="아직 연결한 항목이 없어요"
        action={
          <IconButton
            icon={adding ? X : Plus}
            label={adding ? '연결 추가 닫기' : '연결 추가'}
            size="s"
            active={adding}
            onClick={() => setAdding((value) => !value)}
          />
        }
      >
        {adding && (
          <div className="relations__picker">
            <ItemSearchSelect excludeIds={excludeIds} onPick={addLink} autoFocus />
          </div>
        )}
        {outgoing.map((linked) => (
          <ItemRow
            key={linked.id}
            item={linked}
            onClick={onPick}
            trailing={
              explicitLinks.has(linked.id) && (
                <IconButton icon={Unlink} label="연결 끊기" size="s" onClick={() => removeLink(linked.id)} />
              )
            }
          />
        ))}
      </RelationSection>

      <RelationSection title="백링크" count={backlinks.length} emptyText="이 항목을 가리키는 항목이 없어요">
        {backlinks.map((linked) => (
          <ItemRow key={linked.id} item={linked} onClick={onPick} />
        ))}
      </RelationSection>

      {related.length > 0 && (
        <RelationSection title="관련 항목" count={related.length} emptyText="">
          {related.map((linked) => (
            <ItemRow key={linked.id} item={linked} onClick={onPick} />
          ))}
        </RelationSection>
      )}
    </div>
  );
}
