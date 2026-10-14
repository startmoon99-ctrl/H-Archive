import { useEffect } from 'react'
import { useLatest } from '@/hooks/useLatest'
import { canLoadArchive, useSessionStore } from '@/store/sessionStore'
import { useUiStore } from '@/store/uiStore'
import { useArchiveNav, useArchiveRoute } from './useArchiveRoute'

/**
 * Ctrl/⌘ + K: 검색 열기 · 닫기
 * Esc: 열린 창 닫기 → 없으면 한 단계 위로 → 메인 화면이면 카메라가 처음 구도로 돌아간다
 */
export function useGlobalHotkeys(): void {
  const route = useArchiveRoute()
  const nav = useArchiveNav()
  const latest = useLatest({ route, nav })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const ui = useUiStore.getState()
      // 인트로 중의 키 입력은 Intro가 Skip으로 처리한다. 로그인 전에는 단축키를 받지 않는다.
      if (ui.introPhase === 'playing' || !canLoadArchive(useSessionStore.getState().status)) return
      // 성단 위치 조절 중의 Esc · Enter는 화면 아래의 막대(features/space/ui/ArrangeBar)가 받는다
      if (ui.arranging) return

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        if (ui.dialog?.type === 'search') ui.closeDialog()
        else ui.openDialog({ type: 'search' })
        return
      }
      if (event.key !== 'Escape' || event.isComposing) return
      if (ui.dialog) ui.closeDialog()
      else if (latest.current.route.view !== 'galaxy') latest.current.nav.back()
      else ui.resetView()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [latest])
}
