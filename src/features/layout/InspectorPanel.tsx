import { useLocation } from 'react-router';
import { ItemRow } from '@/components/ItemRow';
import { typeColorStyle } from '@/components/TypeIcon';
import { LIMITS } from '@/config/app';
import { ITEM_TYPE_LIST } from '@/config/itemTypes';
import { ROUTES } from '@/config/navigation';
import { ItemInspector } from '@/features/item/ItemInspector';
import { useItemActions } from '@/hooks/useItemActions';
import { useItem, useItems } from '@/store/selectors';
import { useUiStore } from '@/store/uiStore';
import { byUpdatedDesc, formatRelative } from '@/utils/date';

/** 선택한 항목이 없을 때: 빠른 생성 + 최근 작업 */
function InspectorHome() {
  const items = useItems();
  const openEditor = useUiStore((state) => state.openEditor);
  const actions = useItemActions();
  const onGraph = useLocation().pathname === ROUTES.graph;
  const recent = [...items].sort(byUpdatedDesc).slice(0, LIMITS.inspectorRecent);

  return (
    <div className="inspector-home">
      <section>
        <h2 className="section-label">빠른 생성</h2>
        <div className="inspector-home__create">
          {ITEM_TYPE_LIST.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className="inspector-home__type"
              style={typeColorStyle(id)}
              onClick={() => openEditor({ preset: { type: id } })}
            >
              <Icon size={18} aria-hidden />
              {label}
            </button>
          ))}
        </div>
      </section>

      <section>
        <h2 className="section-label">최근 작업</h2>
        <div className="inspector-home__recent">
          {recent.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              meta={formatRelative(item.updatedAt)}
              onClick={onGraph ? actions.peek : actions.open}
            />
          ))}
        </div>
      </section>

      <p className="inspector-home__hint">그래프에서 노드를 선택하면 연결된 항목과 백링크가 여기에 표시돼요.</p>
    </div>
  );
}

/** PC 오른쪽 고정 패널 */
export function InspectorPanel() {
  const open = useUiStore((state) => state.inspectorOpen);
  const selectedId = useUiStore((state) => state.selectedId);
  const select = useUiStore((state) => state.select);
  const selected = useItem(selectedId);

  return (
    <aside className="inspector" data-open={open} inert={!open} aria-label="정보 패널">
      <div className="inspector__inner">
        {selected ? <ItemInspector itemId={selected.id} onClose={() => select(null)} /> : <InspectorHome />}
      </div>
    </aside>
  );
}
