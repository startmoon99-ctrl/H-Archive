import { Fragment, useMemo, type ReactNode } from 'react';
import { useItemActions } from '@/hooks/useItemActions';
import { useLinkIndex } from '@/store/selectors';
import { useUiStore } from '@/store/uiStore';
import { toSafeUrl } from '@/utils/url';
import { parseWikiLink, WIKILINK_SOURCE } from '@/utils/wikilinks';
import './item.css';

type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'paragraph'; lines: string[] };

const HEADING = /^(#{1,3})\s+(.*)$/;
const LIST_ITEM = /^[-*]\s+(.*)$/;
// [[위키링크]] · URL · **굵게** · `코드`
const INLINE_PATTERNS = [WIKILINK_SOURCE, String.raw`https?:\/\/[^\s<]+`, String.raw`\*\*[^*\n]+\*\*`, '`[^`\\n]+`'];
const INLINE = new RegExp(`(${INLINE_PATTERNS.join('|')})`, 'g');

/** 본문을 제목 / 목록 / 문단 블록으로 나눈다. HTML 을 만들지 않고 React 노드로만 렌더한다. */
function parseBlocks(content: string): Block[] {
  const blocks: Block[] = [];
  for (const rawLine of content.split('\n')) {
    const line = rawLine.trimEnd();
    const last = blocks[blocks.length - 1];
    const heading = line.match(HEADING);
    const listItem = line.match(LIST_ITEM);

    if (!line.trim()) {
      // 빈 줄은 문단을 끊는다
      if (last?.kind === 'paragraph' && last.lines.length) blocks.push({ kind: 'paragraph', lines: [] });
    } else if (heading) {
      blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2] });
    } else if (listItem) {
      if (last?.kind === 'list') last.items.push(listItem[1]);
      else blocks.push({ kind: 'list', items: [listItem[1]] });
    } else if (last?.kind === 'paragraph') {
      last.lines.push(line);
    } else {
      blocks.push({ kind: 'paragraph', lines: [line] });
    }
  }
  return blocks.filter((block) => block.kind !== 'paragraph' || block.lines.length > 0);
}

interface ContentRendererProps {
  content: string;
}

export function ContentRenderer({ content }: ContentRendererProps) {
  const index = useLinkIndex();
  const { open } = useItemActions();
  const openEditor = useUiStore((state) => state.openEditor);
  const blocks = useMemo(() => parseBlocks(content), [content]);

  const renderInline = (text: string): ReactNode =>
    text.split(INLINE).map((part, position) => {
      const key = `${position}:${part}`;
      const wikiLink = parseWikiLink(part);
      if (wikiLink) {
        const title = wikiLink.target;
        const targetId = index.resolveWikiLink(title);
        return targetId ? (
          <button key={key} type="button" className="wikilink" onClick={() => open(targetId)}>
            {title}
          </button>
        ) : (
          // 아직 없는 항목은 눌러서 바로 만들 수 있다
          <button
            key={key}
            type="button"
            className="wikilink wikilink--missing"
            title="아직 없는 항목이에요. 눌러서 만들기"
            onClick={() => openEditor({ preset: { title } })}
          >
            {title}
          </button>
        );
      }
      if (part.startsWith('http')) {
        const href = toSafeUrl(part);
        if (href) {
          return (
            <a key={key} className="content__link" href={href} target="_blank" rel="noopener noreferrer">
              {part}
            </a>
          );
        }
      }
      if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
        return <strong key={key}>{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
        return <code key={key}>{part.slice(1, -1)}</code>;
      }
      return <Fragment key={key}>{part}</Fragment>;
    });

  return (
    <div className="content">
      {blocks.map((block, position) => {
        if (block.kind === 'heading') {
          const Heading = `h${block.level + 1}` as 'h2' | 'h3' | 'h4';
          return <Heading key={position}>{renderInline(block.text)}</Heading>;
        }
        if (block.kind === 'list') {
          return (
            <ul key={position}>
              {block.items.map((item, itemPosition) => (
                <li key={itemPosition}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }
        return (
          <p key={position}>
            {block.lines.map((line, linePosition) => (
              <Fragment key={linePosition}>
                {linePosition > 0 && <br />}
                {renderInline(line)}
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
