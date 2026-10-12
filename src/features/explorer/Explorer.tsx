import { ChevronRight, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { IconButton } from '@/components/IconButton';
import { ItemRow } from '@/components/ItemRow';
import { TypeIcon } from '@/components/TypeIcon';
import { ITEM_TYPE_LIST, type ItemType } from '@/config/itemTypes';
import { useItemActions } from '@/hooks/useItemActions';
import { useItems } from '@/store/selectors';
import { useUiStore } from '@/store/uiStore';
import './explorer.css';

interface ExplorerProps {
  /** 항목을 열었을 때 호출 — 모바일 Drawer 를 닫는 데 쓴다 */
  onNavigate?(): void;
}

/** 콘텐츠 타입별로 묶은 전체 Item 목록 */
export function Explorer({ onNavigate }: ExplorerProps) {
  const items = useItems();
  const selectedId = useUiStore((state) => state.selectedId);
  const openEditor = useUiStore((state) => state.openEditor);
  const { open } = useItemActions();
  const [collapsed, setCollapsed] = useState<ReadonlySet<ItemType>>(new Set());

  const groups = useMemo(
    () =>
      ITEM_TYPE_LIST.map((type) => ({
        type,
        items: items.filter((item) => item.type === type.id).sort((a, b) => a.title.localeCompare(b.title, 'ko')),
      })),
    [items],
  );

  const toggle = (type: ItemType) =>
    setCollapsed((current) => {
      const next = new Set(current);
      if (!next.delete(type)) next.add(type);
      return next;
    });

  const openItem = (id: string) => {
    open(id);
    onNavigate?.();
  };

  return (
    <section className="explorer" aria-label="탐색기">
      <h2 className="section-label explorer__label">탐색기</h2>
      {groups.map(({ type, items: groupItems }) => {
        const isCollapsed = collapsed.has(type.id);
        return (
          <div key={type.id} className="explorer__group">
            <div className="explorer__header">
              <button
                type="button"
                className="explorer__toggle"
                aria-expanded={!isCollapsed}
                onClick={() => toggle(type.id)}
              >
                <ChevronRight className="explorer__chevron" size={14} aria-hidden />
                <TypeIcon type={type.id} size={15} />
                <span className="explorer__type">{type.label}</span>
                <span className="count-badge">{groupItems.length}</span>
              </button>
              <IconButton
                icon={Plus}
                label={`${type.label} 추가`}
                size="s"
                className="explorer__add"
                onClick={() => openEditor({ preset: { type: type.id } })}
              />
            </div>
            <div className="explorer__items" data-collapsed={isCollapsed} inert={isCollapsed}>
              <ul>
                {groupItems.map((item) => (
                  <li key={item.id}>
                    <ItemRow item={item} active={item.id === selectedId} onClick={openItem} />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        );
      })}
    </section>
  );
}
