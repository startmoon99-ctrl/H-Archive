import { ArrowUpRight, Focus, Pencil, X } from 'lucide-react';
import { useLocation, useMatch, useNavigate } from 'react-router';
import { CoverImage } from '@/components/CoverImage';
import { IconButton } from '@/components/IconButton';
import { TagChip } from '@/components/TagChip';
import { TypeBadge } from '@/components/TypeIcon';
import { getItemType } from '@/config/itemTypes';
import { ROUTE_PATTERNS, ROUTES } from '@/config/navigation';
import { useItemActions } from '@/hooks/useItemActions';
import { useItem } from '@/store/selectors';
import { useUiStore } from '@/store/uiStore';
import { formatDate, formatRelative } from '@/utils/date';
import { getExcerpt } from '@/utils/text';
import { ItemRelations } from './ItemRelations';
import './item.css';

interface ItemInspectorProps {
  itemId: string;
  /** 지정하면 닫기 버튼을 보여 준다 */
  onClose?(): void;
}

/** 선택한 Item 의 요약 · 빠른 동작 · 연결 관계. PC 정보 패널 / 태블릿 보조 패널 / 모바일 BottomSheet 가 함께 쓴다. */
export function ItemInspector({ itemId, onClose }: ItemInspectorProps) {
  const item = useItem(itemId);
  const actions = useItemActions();
  const navigate = useNavigate();
  const openEditor = useUiStore((state) => state.openEditor);
  const focusMode = useUiStore((state) => state.graph.focusMode);
  const setFocusMode = useUiStore((state) => state.setFocusMode);
  const onGraph = useLocation().pathname === ROUTES.graph;
  const onOwnPage = useMatch(ROUTE_PATTERNS.item)?.params.id === itemId;

  if (!item) return null;

  const type = getItemType(item.type);
  const excerpt = getExcerpt(item.content);
  const showCover = !onOwnPage && (Boolean(item.thumbnail) || type.gallery);

  const toggleFocus = () => {
    if (onGraph && focusMode) {
      setFocusMode(false);
      return;
    }
    setFocusMode(true);
    actions.showInGraph(item.id);
  };

  return (
    <div className="inspector-item" key={item.id}>
      <header className="inspector-item__header">
        <TypeBadge type={item.type} />
        <span className="inspector-item__date" title={`만든 날 ${formatDate(item.createdAt)}`}>
          {formatRelative(item.updatedAt)} 수정
        </span>
        {onClose && <IconButton icon={X} label="닫기" size="s" onClick={onClose} />}
      </header>

      <h2 className="inspector-item__title">{item.title}</h2>

      {item.tags.length > 0 && (
        <div className="tag-list">
          {item.tags.map((tag) => (
            <TagChip key={tag} tag={tag} onClick={(value) => navigate(ROUTES.tag(value))} />
          ))}
        </div>
      )}

      <div className="inspector-item__actions">
        {!onOwnPage && (
          <button type="button" className="btn btn--primary" onClick={() => actions.open(item.id)}>
            <ArrowUpRight size={16} aria-hidden />
            열기
          </button>
        )}
        <button type="button" className="btn" onClick={() => openEditor({ itemId: item.id })}>
          <Pencil size={15} aria-hidden />
          편집
        </button>
        <button type="button" className="btn" aria-pressed={onGraph && focusMode} onClick={toggleFocus}>
          <Focus size={15} aria-hidden />
          포커스
        </button>
      </div>

      {showCover && (
        <button
          type="button"
          className="inspector-item__cover"
          aria-label={`${item.title} 열기`}
          onClick={() => actions.open(item.id)}
        >
          <CoverImage item={item} />
        </button>
      )}

      {!onOwnPage && excerpt && <p className="inspector-item__excerpt">{excerpt}</p>}

      <ItemRelations item={item} onPick={onGraph ? actions.peek : actions.open} />
    </div>
  );
}
