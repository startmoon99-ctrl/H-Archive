import type { ReactNode } from 'react';
import type { ArchiveItem } from '@/types/archive';
import { TypeIcon } from './TypeIcon';

interface ItemRowProps {
  item: ArchiveItem;
  /** 없으면 누를 수 없는 표시용 행이 된다 */
  onClick?(id: string): void;
  active?: boolean;
  /** 제목 오른쪽의 보조 텍스트 */
  meta?: ReactNode;
  /** 행 끝의 보조 동작 (hover 시 표시) */
  trailing?: ReactNode;
}

/** 탐색기 / 연결 목록 / 최근 항목에서 쓰는 한 줄짜리 Item 표시 */
export function ItemRow({ item, onClick, active, meta, trailing }: ItemRowProps) {
  const content = (
    <>
      <TypeIcon type={item.type} size={15} />
      <span className="item-row__title">{item.title}</span>
      {meta && <span className="item-row__meta">{meta}</span>}
    </>
  );

  return (
    <div className="item-row" data-active={active}>
      {onClick ? (
        <button type="button" className="item-row__main" onClick={() => onClick(item.id)} title={item.title}>
          {content}
        </button>
      ) : (
        <span className="item-row__main">{content}</span>
      )}
      {trailing && <span className="item-row__trailing">{trailing}</span>}
    </div>
  );
}
