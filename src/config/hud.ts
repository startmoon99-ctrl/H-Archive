import { Plus, Search, SlidersHorizontal, type LucideIcon } from 'lucide-react'

export type HudActionId = 'search' | 'add' | 'settings'

export interface HudAction {
  id: HudActionId
  label: string
  icon: LucideIcon
  /** 모바일 Dock에서 가운데에 강조해 놓는다 */
  primary?: boolean
  /** 마우스 환경에서 툴팁에 함께 보여줄 단축키 */
  shortcut?: string
}

const isMac = /Mac|iPhone|iPad/.test(navigator.platform)

/**
 * 화면에 항상 떠 있는 동작. PC는 오른쪽 위, 모바일은 하단 Dock에 같은 목록을 아이콘으로 그린다.
 * label은 화면에 보이지 않고 화면 낭독기와 툴팁에 쓰인다.
 */
export const HUD_ACTIONS: HudAction[] = [
  { id: 'search', label: '검색', icon: Search, shortcut: isMac ? '⌘K' : 'Ctrl K' },
  { id: 'add', label: '창작물 추가', icon: Plus, primary: true },
  { id: 'settings', label: '설정', icon: SlidersHorizontal },
]
