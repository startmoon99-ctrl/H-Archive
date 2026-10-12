import { Trash2, X } from 'lucide-react';
import { useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { useMatch, useNavigate } from 'react-router';
import { IconButton } from '@/components/IconButton';
import { Modal } from '@/components/Modal';
import { typeColorStyle } from '@/components/TypeIcon';
import { DEFAULT_ITEM_TYPE, getItemType, ITEM_TYPE_LIST } from '@/config/itemTypes';
import { ROUTE_PATTERNS, ROUTES } from '@/config/navigation';
import { duplicateTitleMessage } from '@/services/archiveErrors';
import { useArchiveStore } from '@/store/archiveStore';
import { useItem, useItems } from '@/store/selectors';
import { toast } from '@/store/toastStore';
import { useUiStore } from '@/store/uiStore';
import type { ArchiveItem, ItemDraft } from '@/types/archive';
import { findTitleConflict } from '@/utils/wikilinks';
import { CoverField } from './CoverField';
import { LinkPicker } from './LinkPicker';
import { TagInput } from './TagInput';
import './editor.css';

const EMPTY_DRAFT: ItemDraft = { type: DEFAULT_ITEM_TYPE, title: '', content: '', tags: [], links: [] };

const toDraft = (item: ArchiveItem): ItemDraft => ({
  type: item.type,
  title: item.title,
  content: item.content,
  tags: item.tags,
  links: item.links,
  thumbnail: item.thumbnail,
  url: item.url,
});

interface ItemEditorFormProps {
  open: boolean;
  item: ArchiveItem | undefined;
  preset: Partial<ItemDraft> | null;
}

function ItemEditorForm({ open, item, preset }: ItemEditorFormProps) {
  const navigate = useNavigate();
  const viewingItemId = useMatch(ROUTE_PATTERNS.item)?.params.id;
  const items = useItems();
  const closeEditor = useUiStore((state) => state.closeEditor);
  const select = useUiStore((state) => state.select);
  const createItem = useArchiveStore((state) => state.createItem);
  const updateItem = useArchiveStore((state) => state.updateItem);
  const deleteItem = useArchiveStore((state) => state.deleteItem);

  // 이 폼은 열릴 때마다 새로 마운트되므로 초깃값은 한 번만 계산한다
  const [initial] = useState<ItemDraft>(() => (item ? toDraft(item) : { ...EMPTY_DRAFT, ...preset }));
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const type = getItemType(draft.type);
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(initial), [draft, initial]);
  // 저장 시 archiveService 가 같은 규칙으로 다시 검사한다. 여기서는 입력하는 동안 미리 알려 주기만 한다.
  const titleConflict = useMemo(() => findTitleConflict(items, draft.title, item), [items, draft.title, item]);
  const canSave = Boolean(draft.title.trim() || draft.content.trim()) && !titleConflict && !saving;
  const patch = (changes: Partial<ItemDraft>) => setDraft((current) => ({ ...current, ...changes }));

  const requestClose = () => {
    if (dirty && !window.confirm('작성 중인 내용이 사라져요. 닫을까요?')) return;
    closeEditor();
  };

  const save = async () => {
    if (!canSave) return;
    setSaving(true);
    const saved = item ? await updateItem(item.id, draft) : await createItem(draft);
    setSaving(false);
    if (!saved) return;
    select(saved.id);
    toast(item ? '수정했어요' : '저장했어요');
    closeEditor();
  };

  const remove = async () => {
    if (!item) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    if (!(await deleteItem(item.id))) return;
    if (useUiStore.getState().selectedId === item.id) select(null);
    if (viewingItemId === item.id) navigate(ROUTES.graph, { replace: true });
    toast('삭제했어요');
    closeEditor();
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void save();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      void save();
    }
  };

  const coverField = (
    <CoverField label={type.coverLabel} value={draft.thumbnail} onChange={(thumbnail) => patch({ thumbnail })} />
  );

  return (
    <Modal open={open} onClose={requestClose} label={item ? '항목 편집' : '새 항목'} closeOnBackdrop={!dirty}>
      <form className="editor" onSubmit={onSubmit} onKeyDown={onKeyDown}>
        <header className="editor__header">
          <h2>{item ? '항목 편집' : '새 항목'}</h2>
          <IconButton icon={X} label="닫기" onClick={requestClose} />
        </header>

        <div className="editor__body">
          <div className="editor__types" role="radiogroup" aria-label="콘텐츠 타입">
            {ITEM_TYPE_LIST.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={draft.type === id}
                className="editor__type"
                style={typeColorStyle(id)}
                onClick={() => patch({ type: id })}
              >
                <Icon size={16} aria-hidden />
                {label}
              </button>
            ))}
          </div>

          <input
            className="editor__title"
            value={draft.title}
            onChange={(event) => patch({ title: event.target.value })}
            onKeyDown={(event) => {
              // Enter 는 저장이 아니라 본문으로 넘어간다
              if (event.key !== 'Enter' || event.ctrlKey || event.metaKey || event.nativeEvent.isComposing) return;
              event.preventDefault();
              contentRef.current?.focus();
            }}
            placeholder="제목"
            aria-label="제목"
            aria-invalid={Boolean(titleConflict)}
            autoComplete="off"
            data-autofocus
          />
          {titleConflict && (
            <p className="field__error" role="alert">
              {duplicateTitleMessage(titleConflict)}
            </p>
          )}

          {type.url && (
            <label className="field">
              <span className="field__label">{type.url.label}</span>
              <input
                className="input"
                inputMode="url"
                value={draft.url ?? ''}
                onChange={(event) => patch({ url: event.target.value })}
                placeholder={type.url.placeholder}
                autoComplete="off"
              />
            </label>
          )}

          {type.media === 'image' && coverField}

          <div className="field">
            <textarea
              ref={contentRef}
              className="editor__content"
              value={draft.content}
              onChange={(event) => patch({ content: event.target.value })}
              placeholder={type.contentPlaceholder}
              aria-label="본문"
            />
            <p className="field__hint">
              <code>[[제목]]</code> 으로 다른 항목을 본문에서 바로 연결할 수 있어요
            </p>
          </div>

          <div className="field">
            <span className="field__label">태그</span>
            <TagInput value={draft.tags} onChange={(tags) => patch({ tags })} />
          </div>

          <div className="field">
            <span className="field__label">연결</span>
            <LinkPicker value={draft.links} onChange={(links) => patch({ links })} selfId={item?.id} />
          </div>

          {type.media !== 'image' && coverField}
        </div>

        <footer className="editor__footer">
          {item && (
            <button
              type="button"
              className="btn btn--danger"
              data-confirming={confirmingDelete}
              onClick={remove}
              onBlur={() => setConfirmingDelete(false)}
            >
              <Trash2 size={15} aria-hidden />
              {confirmingDelete ? '한 번 더 누르면 삭제돼요' : '삭제'}
            </button>
          )}
          <span className="editor__spacer" />
          <button type="button" className="btn btn--ghost" onClick={requestClose}>
            취소
          </button>
          <button type="submit" className="btn btn--primary" disabled={!canSave}>
            {saving ? '저장 중…' : '저장'}
          </button>
        </footer>
      </form>
    </Modal>
  );
}

/** 생성/편집 대화상자. 열 때마다 key 를 바꿔 폼 상태를 초기화한다. */
export function ItemEditor() {
  const editor = useUiStore((state) => state.editor);
  const item = useItem(editor.itemId);
  return <ItemEditorForm key={editor.session} open={editor.open} item={item} preset={editor.preset} />;
}
