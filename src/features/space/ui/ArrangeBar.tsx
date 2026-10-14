import { Check, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/Button'
import { usePlacementStore } from '@/store/placementStore'
import { useUiStore } from '@/store/uiStore'
import './arrange-bar.css'

/**
 * 성단 위치 조절 중 화면 아래에 떠 있는 막대. 옮긴 자리는 놓을 때마다 저장되고,
 * 취소하면 들어오기 전의 자리로, 자동 배치는 만든 순서로 계산한 자리로 성단이 옮겨 간다.
 */
export function ArrangeBar({ touchUi }: { touchUi: boolean }) {
  const setArranging = useUiStore((state) => state.setArranging)
  const customized = usePlacementStore((state) => Object.keys(state.placements).length > 0)
  // 들어올 때의 자리. 취소하면 여기로 돌아간다
  const [snapshot] = useState(() => usePlacementStore.getState().placements)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.isComposing) return
      if (event.key === 'Escape') {
        usePlacementStore.getState().setPlacements(snapshot)
        setArranging(false)
      } else if (event.key === 'Enter') {
        setArranging(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [snapshot, setArranging])

  const cancel = () => {
    usePlacementStore.getState().setPlacements(snapshot)
    setArranging(false)
  }

  return (
    <div className="arrange-bar enter" role="toolbar" aria-label="성단 위치 조절">
      <p className="arrange-bar__hint">
        성단을 끌어 옮기세요
        <small>
          {touchUi
            ? '빈 곳을 끌면 시점이 돌고, 두 손가락으로 가까이 볼 수 있어요'
            : '빈 곳을 끌면 시점이 돌고, 휠로 가까이 볼 수 있어요'}
        </small>
      </p>
      <div className="arrange-bar__actions">
        <Button
          variant="quiet"
          size="sm"
          icon={RotateCcw}
          disabled={!customized}
          onClick={() => usePlacementStore.getState().clearPlacements()}
        >
          자동 배치
        </Button>
        <Button variant="ghost" size="sm" onClick={cancel}>
          취소
        </Button>
        <Button variant="primary" size="sm" icon={Check} onClick={() => setArranging(false)}>
          완료
        </Button>
      </div>
    </div>
  )
}
