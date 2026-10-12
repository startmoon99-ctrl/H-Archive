import type { ReactNode } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { Button } from '@/components/Button'
import { useUiStore } from '@/store/uiStore'
import { cssVars, cx } from '@/utils/css'
import { yearOf } from '@/utils/format'
import type { SystemLayout } from './layout'
import './system-title.css'

/** 항성계에 들어왔을 때 화면에 떠오르는 이름과 한 줄 요약 */
export function SystemTitle({ system }: { system: SystemLayout }) {
  const openDialog = useUiStore((state) => state.openDialog)
  const { category, projectCount, rings } = system
  const earliest = rings.flatMap((ring) => ring.items.map((item) => item.project.startedAt)).sort()[0]

  const lines: { className?: string; content: ReactNode }[] = [
    { className: 'eyebrow', content: 'Star System' },
    { className: 'system-title__name', content: category.name },
    ...(category.description ? [{ className: 'system-title__description', content: category.description }] : []),
    {
      className: 'system-title__meta',
      content: projectCount > 0 ? `${projectCount}개의 창작물 · ${yearOf(earliest)}년부터` : '아직 비어 있는 항성계',
    },
  ]

  return (
    <header className="system-title" style={cssVars({ hue: category.hue })}>
      {lines.map((line, index) => (
        <p key={index} className={cx('enter', line.className)} style={cssVars({ 'enter-index': index })}>
          {line.content}
        </p>
      ))}
      <div className="system-title__actions enter" style={cssVars({ 'enter-index': lines.length })}>
        {projectCount === 0 && (
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
          항성계 편집
        </Button>
      </div>
    </header>
  )
}
