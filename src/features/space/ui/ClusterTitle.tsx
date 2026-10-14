import type { ReactNode } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/Button'
import { useUiStore } from '@/store/uiStore'
import { cssVars, cx } from '@/utils/css'
import { yearOf } from '@/utils/format'
import type { ClusterLayout } from '../scene/layout'
import './cluster-title.css'

/** 성단에 들어왔을 때 화면에 떠오르는 이름과 한 줄 요약 */
export function ClusterTitle({ cluster }: { cluster: ClusterLayout }) {
  const openDialog = useUiStore((state) => state.openDialog)
  const { category, nodes } = cluster
  const earliest = nodes.map((node) => node.project.startedAt).sort()[0]

  const lines: { className?: string; content: ReactNode }[] = [
    { className: 'eyebrow', content: 'Cluster' },
    { className: 'cluster-title__name', content: category.name },
    ...(category.description ? [{ className: 'cluster-title__description', content: category.description }] : []),
    {
      className: 'cluster-title__meta',
      content: nodes.length > 0 ? `${nodes.length}개의 창작물 · ${yearOf(earliest)}년부터` : '아직 비어 있는 성단',
    },
  ]

  return (
    <header className="cluster-title" style={cssVars({ hue: category.hue })}>
      {lines.map((line, index) => (
        <p key={index} className={cx('enter', line.className)} style={cssVars({ 'enter-index': index })}>
          {line.content}
        </p>
      ))}
      <div className="cluster-title__actions enter" style={cssVars({ 'enter-index': lines.length })}>
        {nodes.length === 0 && (
          <Button
            icon={Plus}
            variant="primary"
            size="sm"
            magnetic
            onClick={() => openDialog({ type: 'project', categoryId: category.id })}
          >
            첫 창작물 추가
          </Button>
        )}
        <Button
          icon={Pencil}
          variant="quiet"
          size="sm"
          onClick={() => openDialog({ type: 'category', categoryId: category.id })}
        >
          성단 편집
        </Button>
      </div>
    </header>
  )
}
