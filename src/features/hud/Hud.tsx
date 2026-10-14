import { Fragment, useCallback, useRef, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useArchiveNav, useArchiveRoute, type ArchiveView } from '@/app/useArchiveRoute'
import { IconButton } from '@/components/Button'
import { APP } from '@/config/app'
import { HUD_ACTIONS, type HudActionId } from '@/config/hud'
import { useViewport } from '@/hooks/useViewport'
import { useUiStore } from '@/store/uiStore'
import { AddMenu } from './AddMenu'
import './hud.css'

/** 뒤로 가기가 데려가는 곳 */
const BACK_LABEL: Record<ArchiveView, string | null> = {
  galaxy: null,
  system: '전체 보기로',
  project: '성단으로',
}

/**
 * 공간 위에 떠 있는 최소한의 UI: 이름 · 뒤로 가기 · 검색 · 추가 · 설정.
 * 동작 버튼은 아이콘만 보인다(이름은 화면 낭독기와 툴팁으로). + 는 추가 메뉴(AddMenu)를 연다.
 */
export function Hud() {
  const route = useArchiveRoute()
  const nav = useArchiveNav()
  const { touchUi } = useViewport()
  const openDialog = useUiStore((state) => state.openDialog)
  const hidden = useUiStore((state) => state.introPhase === 'playing')
  const [adding, setAdding] = useState(false)
  const addRef = useRef<HTMLSpanElement>(null)
  const closeAdd = useCallback(() => setAdding(false), [])

  const run: Record<HudActionId, () => void> = {
    search: () => openDialog({ type: 'search' }),
    add: () => setAdding((open) => !open),
    settings: () => openDialog({ type: 'settings' }),
  }
  const backLabel = BACK_LABEL[route.view]

  return (
    <div className="hud" data-hidden={hidden} inert={hidden}>
      <header className="hud__bar">
        {backLabel && <IconButton icon={ArrowLeft} label={backLabel} variant="ghost" magnetic onClick={nav.back} />}
        <button type="button" className="hud__brand" onClick={nav.toGalaxy} aria-label={`${APP.name} 전체 보기`}>
          {APP.name}
        </button>
      </header>

      <nav className="hud__actions" data-placement={touchUi ? 'dock' : 'corner'} aria-label="주요 동작">
        {HUD_ACTIONS.map((action) => {
          const isAdd = action.id === 'add'
          const menu = isAdd ? { 'aria-haspopup': 'menu' as const, 'aria-expanded': adding } : {}
          const button = touchUi ? (
            <button
              type="button"
              className="hud__dock-item"
              data-primary={action.primary ?? false}
              aria-label={action.label}
              onClick={run[action.id]}
              {...menu}
            >
              <action.icon aria-hidden="true" />
            </button>
          ) : (
            <IconButton
              icon={action.icon}
              label={action.label}
              title={action.shortcut ? `${action.label} (${action.shortcut})` : action.label}
              variant="ghost"
              magnetic
              onClick={run[action.id]}
              {...menu}
            />
          )
          if (!isAdd) return <Fragment key={action.id}>{button}</Fragment>
          return (
            <span key={action.id} ref={addRef} className="hud__add">
              {button}
              {adding && <AddMenu triggerRef={addRef} onClose={closeAdd} />}
            </span>
          )
        })}
      </nav>
    </div>
  )
}
