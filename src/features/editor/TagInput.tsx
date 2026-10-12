import { useMemo, useState, type KeyboardEvent } from 'react';
import { TagChip } from '@/components/TagChip';
import { LIMITS } from '@/config/app';
import { useItems } from '@/store/selectors';
import { getTagCounts, normalizeTag } from '@/utils/tags';

interface TagInputProps {
  value: string[];
  onChange(tags: string[]): void;
}

export function TagInput({ value, onChange }: TagInputProps) {
  const items = useItems();
  const [draft, setDraft] = useState('');

  // 이미 쓰고 있는 태그를 먼저 제안해서 표기가 갈라지지 않게 한다
  const suggestions = useMemo(() => {
    const query = normalizeTag(draft).toLowerCase();
    return getTagCounts(items)
      .map((entry) => entry.tag)
      .filter((tag) => !value.includes(tag) && tag.toLowerCase().includes(query))
      .slice(0, LIMITS.tagSuggestions);
  }, [items, draft, value]);

  const add = (raw: string) => {
    const tag = normalizeTag(raw);
    if (tag && !value.includes(tag)) onChange([...value, tag]);
    setDraft('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // 한글 조합 중의 Enter 는 글자 확정이므로 무시한다
    if (event.nativeEvent.isComposing) return;
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      add(draft);
    } else if (event.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <div className="tag-input">
      <div className="tag-input__box">
        {value.map((tag) => (
          <TagChip key={tag} tag={tag} onRemove={(removed) => onChange(value.filter((current) => current !== removed))} />
        ))}
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => draft && add(draft)}
          placeholder={value.length ? '' : '태그 입력 후 Enter'}
          aria-label="태그 추가"
          autoComplete="off"
        />
      </div>
      {suggestions.length > 0 && (
        <div className="tag-list">
          {suggestions.map((tag) => (
            <TagChip key={tag} tag={tag} onClick={add} />
          ))}
        </div>
      )}
    </div>
  );
}
