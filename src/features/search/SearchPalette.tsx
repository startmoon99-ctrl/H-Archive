import { CornerDownLeft, SearchX } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { EmptyState } from '@/components/EmptyState';
import { Modal } from '@/components/Modal';
import { SearchField } from '@/components/SearchField';
import { TypeFilter } from '@/components/TypeFilter';
import { TypeIcon } from '@/components/TypeIcon';
import type { ItemType } from '@/config/itemTypes';
import { useItemActions } from '@/hooks/useItemActions';
import { useItems } from '@/store/selectors';
import { useUiStore } from '@/store/uiStore';
import { formatRelative } from '@/utils/date';
import { searchItems } from '@/utils/search';
import { getExcerpt } from '@/utils/text';
import './search.css';

const EXCERPT_LENGTH = 80;

function SearchPaletteBody({ onClose }: { onClose(): void }) {
  const items = useItems();
  const { open } = useItemActions();
  const [query, setQuery] = useState('');
  const [types, setTypes] = useState<ReadonlySet<ItemType>>(new Set());
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  // 타입을 하나도 고르지 않으면 전체를 검색한다
  const results = useMemo(
    () => searchItems(items, query, { types: types.size ? types : undefined }),
    [items, query, types],
  );

  useEffect(() => {
    listRef.current?.querySelector('[data-active="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  const pick = (id: string) => {
    onClose();
    open(id);
  };

  const toggleType = (type: ItemType) => {
    setTypes((current) => {
      const next = new Set(current);
      if (!next.delete(type)) next.add(type);
      return next;
    });
    setActiveIndex(0);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((index) => (index + step + results.length) % Math.max(1, results.length));
    } else if (event.key === 'Enter' && results[activeIndex]) {
      event.preventDefault();
      pick(results[activeIndex].id);
    }
  };

  return (
    <div className="search">
      <div className="search__input">
        <SearchField
          size="large"
          value={query}
          onChange={(value) => {
            setQuery(value);
            setActiveIndex(0);
          }}
          onKeyDown={onKeyDown}
          placeholder="제목, 내용, #태그 검색"
          aria-label="아카이브 검색"
          data-autofocus
        />
        {/* 검색어 지우기(X)와 헷갈리지 않도록 글자 버튼으로 둔다 */}
        <button type="button" className="btn btn--ghost search__close" onClick={onClose}>
          닫기
        </button>
      </div>

      <div className="search__filters">
        <TypeFilter isActive={(type) => types.has(type)} onToggle={toggleType} />
      </div>

      {results.length ? (
        <>
          <p className="section-label search__label">{query.trim() ? `결과 ${results.length}` : '최근 항목'}</p>
          <ul className="search__results" ref={listRef}>
            {results.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="search__result"
                  data-active={index === activeIndex}
                  onMouseMove={() => setActiveIndex(index)}
                  onClick={() => pick(item.id)}
                >
                  <TypeIcon type={item.type} boxed />
                  <span className="search__text">
                    <span className="search__title">{item.title}</span>
                    <span className="search__excerpt">
                      {getExcerpt(item.content, EXCERPT_LENGTH) || item.tags.map((tag) => `#${tag}`).join(' ')}
                    </span>
                  </span>
                  <span className="search__meta">{formatRelative(item.updatedAt)}</span>
                  <CornerDownLeft className="search__enter" size={14} aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <EmptyState icon={SearchX} title="찾는 항목이 없어요" description="다른 검색어나 타입으로 다시 찾아보세요" />
      )}
    </div>
  );
}

export function SearchPalette() {
  const open = useUiStore((state) => state.searchOpen);
  const setOpen = useUiStore((state) => state.setSearchOpen);
  const close = () => setOpen(false);

  return (
    <Modal open={open} onClose={close} label="검색" variant="palette">
      <SearchPaletteBody onClose={close} />
    </Modal>
  );
}
