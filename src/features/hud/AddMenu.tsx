import { useEffect, useRef, type RefObject } from 'react'
import { Orbit, Plus, type LucideIcon } from 'lucide-react'
import { useAddAction } from '@/app/useAddAction'
import { useArchiveRoute } from '@/app/useArchiveRoute'
import { useUiStore } from '@/store/uiStore'
import './add-menu.css'

interface AddMenuItem {
  key: string
  label: string
  icon: LucideIcon
  run: () => void
}

interface AddMenuProps {
  /** 메뉴를 연 버튼(또는 그 버튼을 감싼 요소). 바깥을 눌렀는지 가릴 때와 닫은 뒤 초점을 돌려줄 때 쓴다 */
  triggerRef: RefObject<HTMLElement | null>
  onClose: () => void
}

/**
 * + 버튼의 작은 메뉴: 지금 위치에서의 "추가"(창작물 · 기록, app/useAddAction)와 성단 추가.
 * 바깥을 누르거나 Esc를 누르면 닫힌다. 위치는 놓인 자리(PC 오른쪽 위 · 모바일 Dock)에 맞춰 CSS가 정한다.
 */
export function AddMenu({ triggerRef, onClose }: AddMenuProps) {
  const route = useArchiveRoute()
  const add = useAddAction()
  const openDialog = useUiStore((state) => state.openDialog)
  const menuRef = useRef<HTMLDivElement>(null)

  const items: AddMenuItem[] = [
    { key: 'add', label: route.view === 'project' ? '기록 추가' : '창작물 추가', icon: Plus, run: () => add() },
    { key: 'category', label: '성단 추가', icon: Orbit, run: () => openDialog({ type: 'category' }) },
  ]

  useEffect(() => {
    menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus({ preventScroll: true })

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return
      onClose()
    }
    // 앱 전체의 Esc(뒤로 가기)보다 먼저 받아 메뉴만 닫는다
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.stopImmediatePropagation()
      onClose()
      triggerRef.current?.querySelector('button')?.focus()
    }
    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown, true)
    }
  }, [triggerRef, onClose])

  return (
    <div ref={menuRef} className="add-menu" role="menu" aria-label="추가">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          role="menuitem"
          className="add-menu__item"
          onClick={() => {
            onClose()
            item.run()
          }}
        >
          <item.icon aria-hidden="true" />
          {item.label}
        </button>
      ))}
    </div>
  )
}
