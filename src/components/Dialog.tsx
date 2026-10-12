import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { usePresence } from '@/hooks/usePresence'
import { IconButton } from './Button'
import './dialog.css'

/**
 * modal: 가운데 입력 창 / drawer: 옆에서 나오는 패널 / palette: 위쪽 검색 창 / viewer: 전체 화면
 * 모바일에서는 modal과 drawer가 Bottom Sheet로 바뀐다(dialog.css).
 */
export type DialogVariant = 'modal' | 'drawer' | 'palette' | 'viewer'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'

/** 열려 있는 동안 Tab 이동을 창 안에 가두고, 닫히면 원래 자리로 초점을 돌려준다. */
function useFocusTrap(panelRef: RefObject<HTMLElement | null>, active: boolean): void {
  useEffect(() => {
    const panel = panelRef.current
    if (!active || !panel) return
    const previous = document.activeElement as HTMLElement | null
    ;(panel.querySelector<HTMLElement>('[data-autofocus]') ?? panel).focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return
      const items = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)]
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
    panel.addEventListener('keydown', onKeyDown)
    return () => {
      panel.removeEventListener('keydown', onKeyDown)
      previous?.focus()
    }
  }, [panelRef, active])
}

interface DialogProps {
  open: boolean
  onClose: () => void
  variant: DialogVariant
  /** 창 제목. palette · viewer에서는 보이지 않고 이름으로만 쓴다. */
  label: string
  children: ReactNode
}

/** Esc로 닫는 처리는 app/useGlobalHotkeys가 한다(뒤로 가기와 순서를 맞추기 위해). */
export function Dialog({ open, onClose, variant, label, children }: DialogProps) {
  const { mounted, state } = usePresence(open, 'base')
  const panelRef = useRef<HTMLDivElement>(null)
  useFocusTrap(panelRef, mounted)

  if (!mounted) return null
  const hasHeader = variant === 'modal' || variant === 'drawer'

  return createPortal(
    <div className="dialog" data-variant={variant} data-state={state}>
      <div className="dialog__backdrop" onClick={onClose} />
      <div ref={panelRef} className="dialog__panel" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}>
        {hasHeader && (
          <header className="dialog__header">
            <h2 className="dialog__title">{label}</h2>
            <IconButton icon={X} label="닫기" variant="quiet" size="sm" onClick={onClose} />
          </header>
        )}
        {children}
      </div>
    </div>,
    document.body,
  )
}

export function DialogBody({ children }: { children: ReactNode }) {
  return <div className="dialog__body scroll-area">{children}</div>
}

export function DialogFooter({ children }: { children: ReactNode }) {
  return <footer className="dialog__footer">{children}</footer>
}
