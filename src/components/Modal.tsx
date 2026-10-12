import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useLatest } from '@/hooks/useLatest';
import { usePresence } from '@/hooks/usePresence';
import './Modal.css';

const FOCUSABLE = 'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  open: boolean;
  onClose(): void;
  /** 접근성 이름 */
  label: string;
  /** dialog: 일반 대화상자 / palette: 상단 정렬 검색창 / lightbox: 화면 전체 미디어 */
  variant?: 'dialog' | 'palette' | 'lightbox';
  closeOnBackdrop?: boolean;
  children: ReactNode;
}

export function Modal({ open, onClose, label, variant = 'dialog', closeOnBackdrop = true, children }: ModalProps) {
  const { mounted, state } = usePresence(open);
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useLatest(onClose);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    (panel?.querySelector<HTMLElement>('[data-autofocus]') ?? panel)?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== 'Tab' || !panel) return;
      // 포커스가 모달 밖으로 빠져나가지 않게 순환시킨다
      const focusables = panel.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open, onCloseRef]);

  if (!mounted) return null;

  return createPortal(
    <div className="modal" data-state={state} data-variant={variant}>
      <div className="modal__backdrop" onClick={closeOnBackdrop ? onClose : undefined} />
      <div className="modal__panel" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1} ref={panelRef}>
        {children}
      </div>
    </div>,
    document.body,
  );
}
