import { ITEM_TYPE_LIST, type ItemType } from '@/config/itemTypes';
import { typeColorStyle } from './TypeIcon';

interface TypeFilterProps {
  isActive(type: ItemType): boolean;
  onToggle(type: ItemType): void;
  counts?: ReadonlyMap<ItemType, number>;
}

/** 콘텐츠 타입 토글 — 그래프 범례 / 갤러리 / 검색이 함께 쓴다 */
export function TypeFilter({ isActive, onToggle, counts }: TypeFilterProps) {
  return (
    <div className="type-filter" role="group" aria-label="콘텐츠 타입 필터">
      {ITEM_TYPE_LIST.map((type) => (
        <button
          key={type.id}
          type="button"
          className="type-filter__chip"
          style={typeColorStyle(type.id)}
          aria-pressed={isActive(type.id)}
          onClick={() => onToggle(type.id)}
        >
          <span className="type-filter__dot" />
          {type.label}
          {counts && <span className="type-filter__count">{counts.get(type.id) ?? 0}</span>}
        </button>
      ))}
    </div>
  );
}
