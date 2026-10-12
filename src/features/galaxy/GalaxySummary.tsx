import { Plus } from 'lucide-react'
import { useAddAction } from '@/app/useAddAction'
import { Button } from '@/components/Button'
import type { Category, Project } from '@/types/archive'
import { yearOf } from '@/utils/format'
import './galaxy-summary.css'

interface GalaxySummaryProps {
  categories: Category[]
  projects: Project[]
  visible: boolean
}

/** 은하 전체를 볼 때의 조용한 한 줄: 지금까지 얼마나 만들어 왔는지 */
export function GalaxySummary({ categories, projects, visible }: GalaxySummaryProps) {
  const add = useAddAction()

  if (categories.length === 0) {
    return (
      <div className="galaxy-empty" data-visible={visible}>
        <p className="galaxy-empty__title">아직 비어 있는 은하</p>
        <p className="galaxy-empty__text">파일을 이 화면으로 끌어다 놓거나, 첫 창작물을 직접 추가하세요.</p>
        <Button icon={Plus} variant="primary" magnetic onClick={() => add()}>
          첫 창작물 추가
        </Button>
      </div>
    )
  }

  const since = projects.map((project) => project.startedAt).sort()[0]
  const facts = [
    `${categories.length} Systems`,
    `${projects.length} Works`,
    ...(since ? [`Since ${yearOf(since)}`] : []),
  ]

  return (
    <p className="galaxy-summary eyebrow" data-visible={visible}>
      {facts.map((fact) => (
        <span key={fact}>{fact}</span>
      ))}
    </p>
  )
}
