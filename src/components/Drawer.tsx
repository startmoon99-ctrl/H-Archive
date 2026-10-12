import { useEffect, type ReactNode } from 'react';
import { useLatest } from '@/hooks/useLatest';
import { usePresence } from '@/hooks/usePresence';
import './Drawer.css';

interface DrawerProps {
  open: boolean;
  onClose(): void;
  label: string;
  side?: 'left' | 'right';
  /** true: 배경을 덮는 모달 서랍 / false: 주변 조작을 막지 않는 보조 패널 */
  modal?: boolean;
  children: ReactNode;
}

export function Drawer({ open, onClose, label, side = 'left', modal = true, children }: DrawerProps) {
  const { mounted, state } = usePresence(open);
  const onCloseRef = useLatest(onClose);

  useEffect(() => {
    if (!open || !modal) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, modal, onCloseRef]);

  if (!mounted) return null;

  return (
    <div className="drawer" data-state={state} data-side={side} data-modal={modal}>
      {modal && <div className="drawer__backdrop" onClick={onClose} />}
      <aside className="drawer__panel" aria-label={label}>
        {children}
      </aside>
    </div>
  );
}
