import { Plus } from 'lucide-react'
import { useAddAction } from '@/app/useAddAction'
import { Button } from '@/components/Button'
import './space-summary.css'

interface SpaceSummaryProps {
  /** 성단이 하나라도 있는가. 있으면 아무것도 그리지 않는다 */
  empty: boolean
  visible: boolean
}

/** 전체 보기가 비어 있을 때만 가운데에 떠오르는 안내. 기록이 있으면 공간만 보인다. */
export function SpaceSummary({ empty, visible }: SpaceSummaryProps) {
  const add = useAddAction()
  if (!empty) return null
  return (
    <div className="space-empty" data-visible={visible}>
      <p className="space-empty__title">아직 비어 있는 공간</p>
      <p className="space-empty__text">파일을 이 화면으로 끌어다 놓거나, 첫 창작물을 직접 추가하세요.</p>
      <Button icon={Plus} variant="primary" magnetic onClick={() => add()}>
        첫 창작물 추가
      </Button>
    </div>
  )
}
