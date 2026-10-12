import { X } from 'lucide-react';
import { useMemo } from 'react';
import { IconButton } from '@/components/IconButton';
import { ItemRow } from '@/components/ItemRow';
import { ItemSearchSelect } from '@/features/item/ItemSearchSelect';
import { useItemMap } from '@/store/selectors';

interface LinkPickerProps {
  value: string[];
  onChange(ids: string[]): void;
  /** 편집 중인 Item — 자기 자신은 연결 대상에서 뺀다 */
  selfId?: string;
}

export function LinkPicker({ value, onChange, selfId }: LinkPickerProps) {
  const itemMap = useItemMap();
  const linked = value.flatMap((id) => itemMap.get(id) ?? []);
  const excludeIds = useMemo(() => new Set(selfId ? [selfId, ...value] : value), [selfId, value]);

  return (
    <div className="link-picker">
      {linked.length > 0 && (
        <div className="link-picker__list">
          {linked.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              trailing={
                <IconButton
                  icon={X}
                  label={`${item.title} 연결 제거`}
                  size="s"
                  onClick={() => onChange(value.filter((id) => id !== item.id))}
                />
              }
            />
          ))}
        </div>
      )}
      <ItemSearchSelect excludeIds={excludeIds} onPick={(id) => onChange([...value, id])} />
    </div>
  );
}
