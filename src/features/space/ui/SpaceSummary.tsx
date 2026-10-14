import { Plus } from 'lucide-react'
import { useAddAction } from '@/app/useAddAction'
import { Button } from '@/components/Button'
import type { Category, Project } from '@/types/archive'
import { yearOf } from '@/utils/format'
import './space-summary.css'

interface SpaceSummaryProps {
  categories: Category[]
  projects: Project[]
  visible: boolean
}

/** 전체 보기의 조용한 한 줄: 지금까지 얼마나 만들어 왔는지 */
export function SpaceSummary({ categories, projects, visible }: SpaceSummaryProps) {
  const add = useAddAction()

  if (categories.length === 0) {
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

  const since = projects.map((project) => project.startedAt).sort()[0]
  const facts = [
    `${categories.length} Clusters`,
    `${projects.length} Works`,
    ...(since ? [`Since ${yearOf(since)}`] : []),
  ]

  return (
    <p className="space-summary eyebrow" data-visible={visible}>
      {facts.map((fact) => (
        <span key={fact}>{fact}</span>
      ))}
    </p>
  )
}
