import { useMemo, useRef } from 'react'
import { Plus } from 'lucide-react'
import { Button } from '@/components/Button'
import { useScrollLinked, type ScrollMeasure } from '@/hooks/useScrollLinked'
import { Reveal } from '@/motion/Reveal'
import { useUiStore } from '@/store/uiStore'
import type { Project } from '@/types/archive'
import { clamp } from '@/utils/math'
import { sortTimeline } from '@/utils/project'
import { TimelineEntryCard } from './TimelineEntryCard'
import './timeline.css'

/** 화면의 이 높이를 지난 만큼 타임라인의 선이 채워진다 */
const READING_LINE = 0.62
const timelineProgress: ScrollMeasure = (rect, viewportHeight) =>
  clamp((viewportHeight * READING_LINE - rect.top) / rect.height, 0, 1)

/** 프로젝트의 개발 타임라인. 오래된 기록부터 지금까지 이야기 순서로 읽힌다. */
export function Timeline({ project }: { project: Project }) {
  const openDialog = useUiStore((state) => state.openDialog)
  const trackRef = useRef<HTMLDivElement>(null)
  const entries = useMemo(() => sortTimeline(project.timeline), [project.timeline])
  useScrollLinked(trackRef, timelineProgress)

  const addEntry = () => openDialog({ type: 'entry', projectId: project.id })

  return (
    <section className="timeline" aria-label="개발 타임라인">
      <Reveal className="timeline__heading">
        <p className="eyebrow">Timeline</p>
        <h2 className="timeline__title">만들어 온 과정</h2>
      </Reveal>

      <div ref={trackRef} className="timeline__track">
        <span className="timeline__line" aria-hidden="true" />
        <ol className="timeline__list">
          {entries.map((entry) => (
            <TimelineEntryCard key={entry.id} projectId={project.id} entry={entry} />
          ))}
        </ol>

        <div className="timeline__now">
          <span className="entry__node" data-now aria-hidden="true" />
          <Reveal className="timeline__now-content">
            <p className="timeline__now-label">{entries.length === 0 ? '아직 기록이 없습니다' : '지금'}</p>
            <Button icon={Plus} variant="primary" magnetic onClick={addEntry}>
              기록 추가
            </Button>
          </Reveal>
        </div>
      </div>
    </section>
  )
}
