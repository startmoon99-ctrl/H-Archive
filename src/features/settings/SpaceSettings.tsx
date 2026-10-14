import { Move } from 'lucide-react'
import { useArchiveNav } from '@/app/useArchiveRoute'
import { Button } from '@/components/Button'
import { usePlacementStore } from '@/store/placementStore'
import { useUiStore } from '@/store/uiStore'

/** 공간의 배치. 성단 위치 조절을 누르면 설정이 닫히고 전체 보기에서 성단을 끌어 옮길 수 있다 */
export function SpaceSettings({ onClose }: { onClose: () => boolean }) {
  const nav = useArchiveNav()
  const setArranging = useUiStore((state) => state.setArranging)
  const moved = usePlacementStore((state) => Object.keys(state.placements).length)

  const start = () => {
    onClose()
    nav.toGalaxy()
    setArranging(true)
  }

  return (
    <section className="settings__section" aria-labelledby="settings-space">
      <h3 id="settings-space" className="eyebrow">
        Space
      </h3>
      <p className="settings__text">
        성단을 끌어 원하는 자리에 놓습니다. 시점을 돌려 가며 앞뒤로도 옮길 수 있어요.
      </p>
      <p className="settings__text" data-tone="faint">
        {moved > 0 ? `직접 옮긴 성단 ${moved}개 · ` : ''}옮긴 자리는 이 브라우저에만 저장됩니다.
      </p>
      <Button icon={Move} variant="ghost" size="sm" onClick={start}>
        성단 위치 조절
      </Button>
    </section>
  )
}
