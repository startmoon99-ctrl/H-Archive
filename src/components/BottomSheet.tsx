import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from 'react';
import { SHEET } from '@/config/app';
import { MOTION } from '@/config/motion';
import { usePresence } from '@/hooks/usePresence';
import './BottomSheet.css';

type Snap = 'peek' | 'full';

interface DragState {
  startY: number;
  startOffset: number;
  offset: number;
  moved: boolean;
}

interface BottomSheetProps {
  open: boolean;
  onClose(): void;
  label: string;
  children: ReactNode;
}

/**
 * 화면 아래에서 올라오는 비모달 시트.
 * peek(절반) ↔ full 두 단계로 스냅하고, peek 아래로 끌어내리면 닫힌다.
 */
export function BottomSheet({ open, onClose, label, children }: BottomSheetProps) {
  const { mounted, state } = usePresence(open, MOTION.duration.base);
  const [snap, setSnap] = useState<Snap>('peek');
  const panelRef = useRef<HTMLDivElement>(null);
  const drag = useRef<DragState | null>(null);

  useEffect(() => {
    if (open) setSnap('peek');
  }, [open]);

  if (!mounted) return null;

  const getOffsets = () => {
    const height = panelRef.current?.offsetHeight ?? 0;
    return { peek: height * (1 - SHEET.peekRatio), closed: height };
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    // full 상태에서는 내용 스크롤과 겹치지 않도록 핸들에서만 끌 수 있다
    const onHandle = (event.target as Element).closest('[data-sheet-handle]');
    if (snap === 'full' && !onHandle) return;
    const startOffset = snap === 'peek' ? getOffsets().peek : 0;
    drag.current = { startY: event.clientY, startOffset, offset: startOffset, moved: false };
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const current = drag.current;
    const panel = panelRef.current;
    if (!current || !panel) return;
    const delta = event.clientY - current.startY;
    if (!current.moved) {
      if (Math.abs(delta) < SHEET.dragThreshold) return;
      current.moved = true;
      panel.setPointerCapture(event.pointerId);
      panel.dataset.dragging = 'true';
    }
    current.offset = Math.min(getOffsets().closed, Math.max(0, current.startOffset + delta));
    panel.style.transform = `translateY(${current.offset}px)`;
  };

  const onPointerEnd = () => {
    const current = drag.current;
    const panel = panelRef.current;
    drag.current = null;
    if (!current?.moved || !panel) return;

    delete panel.dataset.dragging;
    panel.style.transform = '';
    const { peek, closed } = getOffsets();
    const delta = current.offset - current.startOffset;
    if (current.offset > peek + (closed - peek) * SHEET.closeRatio) onClose();
    else if (delta < -SHEET.snapDistance) setSnap('full');
    else if (delta > SHEET.snapDistance) setSnap('peek');
  };

  return (
    <div className="sheet" data-state={state}>
      <div
        ref={panelRef}
        className="sheet__panel"
        role="region"
        aria-label={label}
        data-snap={snap}
        style={{ '--sheet-peek-ratio': SHEET.peekRatio } as CSSProperties}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <button
          type="button"
          className="sheet__handle"
          data-sheet-handle
          aria-label={snap === 'peek' ? '패널 펼치기' : '패널 접기'}
          aria-expanded={snap === 'full'}
          onClick={() => setSnap((value) => (value === 'peek' ? 'full' : 'peek'))}
        />
        <div className="sheet__content">{children}</div>
      </div>
    </div>
  );
}
