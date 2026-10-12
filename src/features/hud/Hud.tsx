import { ArrowLeft } from 'lucide-react'
import { useAddAction } from '@/app/useAddAction'
import { useArchiveNav, useArchiveRoute, type ArchiveView } from '@/app/useArchiveRoute'
import { Button, IconButton } from '@/components/Button'
import { APP } from '@/config/app'
import { HUD_ACTIONS, type HudActionId } from '@/config/hud'
import { useViewport } from '@/hooks/useViewport'
import { useUiStore } from '@/store/uiStore'
import './hud.css'

/** 뒤로 가기가 데려가는 곳 */
const BACK_LABEL: Record<ArchiveView, string | null> = {
  galaxy: null,
  system: '은하로',
  project: '항성계로',
}

/** 은하 위에 떠 있는 최소한의 UI: 이름 · 뒤로 가기 · 검색 · 추가 · 설정 */
export function Hud() {
  const route = useArchiveRoute()
  const nav = useArchiveNav()
  const add = useAddAction()
  const { touchUi } = useViewport()
  const openDialog = useUiStore((state) => state.openDialog)
  const hidden = useUiStore((state) => state.introPhase === 'playing')

  const run: Record<HudActionId, () => void> = {
    search: () => openDialog({ type: 'search' }),
    add: () => add(),
    settings: () => openDialog({ type: 'settings' }),
  }
  const backLabel = BACK_LABEL[route.view]

  return (
    <div className="hud" data-hidden={hidden} inert={hidden}>
      <header className="hud__bar">
        {backLabel && <IconButton icon={ArrowLeft} label={backLabel} variant="ghost" magnetic onClick={nav.back} />}
        <button type="button" className="hud__brand" onClick={nav.toGalaxy} aria-label={`${APP.name} 은하 전체 보기`}>
          {APP.name}
        </button>
      </header>

      <nav className="hud__actions" data-placement={touchUi ? 'dock' : 'corner'} aria-label="주요 동작">
        {HUD_ACTIONS.map((action) =>
          touchUi ? (
            <button
              key={action.id}
              type="button"
              className="hud__dock-item"
              data-primary={action.primary ?? false}
              onClick={run[action.id]}
            >
              <action.icon aria-hidden="true" />
              <span>{action.label}</span>
            </button>
          ) : (
            <Button key={action.id} icon={action.icon} variant="ghost" magnetic onClick={run[action.id]}>
              {action.label}
              {action.shortcut && <kbd className="hud__shortcut">{action.shortcut}</kbd>}
            </Button>
          ),
        )}
      </nav>
    </div>
  )
}
