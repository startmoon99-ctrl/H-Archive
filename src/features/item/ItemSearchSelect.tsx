import { useMemo, useState, type KeyboardEvent } from 'react';
import { SearchField } from '@/components/SearchField';
import { TypeIcon } from '@/components/TypeIcon';
import { LIMITS } from '@/config/app';
import { getItemType } from '@/config/itemTypes';
import { useItems } from '@/store/selectors';
import { searchItems } from '@/utils/search';
import './item.css';

interface ItemSearchSelectProps {
  excludeIds: ReadonlySet<string>;
  onPick(id: string): void;
  placeholder?: string;
  autoFocus?: boolean;
}

/** 연결할 Item 을 검색해서 고르는 입력 — Editor 와 정보 패널이 함께 쓴다 */
export function ItemSearchSelect({
  excludeIds,
  onPick,
  placeholder = '연결할 항목 검색',
  autoFocus,
}: ItemSearchSelectProps) {
  const items = useItems();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [open, setOpen] = useState(Boolean(autoFocus));

  const results = useMemo(
    () => searchItems(items, query, { excludeIds, limit: LIMITS.pickerResults }),
    [items, query, excludeIds],
  );

  const pick = (id: string) => {
    onPick(id);
    setQuery('');
    setActiveIndex(0);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // 한글 조합 중의 키 입력은 글자 확정에 쓰이므로 건드리지 않는다
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActiveIndex((index) => (index + step + results.length) % Math.max(1, results.length));
    } else if (event.key === 'Enter') {
      // 폼 제출로 이어지지 않게 막고 현재 후보를 고른다
      event.preventDefault();
      if (open && results[activeIndex]) pick(results[activeIndex].id);
    } else if (event.key === 'Escape' && open && query) {
      event.stopPropagation();
      setQuery('');
    }
  };

  return (
    <div
      className="item-select"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
      }}
    >
      <SearchField
        value={query}
        onChange={(value) => {
          setQuery(value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        aria-label={placeholder}
      />
      {open &&
        (results.length ? (
          <ul className="item-select__list">
            {results.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="item-select__option"
                  data-active={index === activeIndex}
                  // 클릭 전에 입력창이 blur 되어 목록이 닫히는 것을 막는다
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => pick(item.id)}
                >
                  <TypeIcon type={item.type} size={15} />
                  <span className="item-select__title">{item.title}</span>
                  <span className="item-select__type">{getItemType(item.type).label}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="item-select__empty">연결할 수 있는 항목이 없어요</p>
        ))}
    </div>
  );
}
