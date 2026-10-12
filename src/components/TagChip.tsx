import { X } from 'lucide-react';

interface TagChipProps {
  tag: string;
  count?: number;
  active?: boolean;
  onClick?(tag: string): void;
  onRemove?(tag: string): void;
}

export function TagChip({ tag, count, active, onClick, onRemove }: TagChipProps) {
  const label = (
    <>
      #{tag}
      {count !== undefined && <span className="tag-chip__count">{count}</span>}
    </>
  );

  // 삭제 버튼이 있으면 버튼을 중첩할 수 없으므로 span 으로 감싼다
  if (onRemove) {
    return (
      <span className="tag-chip" data-active={active}>
        <span className="tag-chip__label">{label}</span>
        <button type="button" className="tag-chip__remove" aria-label={`${tag} 태그 제거`} onClick={() => onRemove(tag)}>
          <X size={12} aria-hidden />
        </button>
      </span>
    );
  }

  if (onClick) {
    return (
      <button type="button" className="tag-chip" data-active={active} aria-pressed={active} onClick={() => onClick(tag)}>
        {label}
      </button>
    );
  }

  return (
    <span className="tag-chip" data-active={active}>
      {label}
    </span>
  );
}
