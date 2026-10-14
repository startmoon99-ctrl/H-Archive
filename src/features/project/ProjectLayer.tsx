import { useCallback, useEffect, useRef, useState } from 'react'
import { useArchiveNav, useArchiveRoute } from '@/app/useArchiveRoute'
import { Button } from '@/components/Button'
import { projectMotion } from '@/config/motion'
import { useLastDefined, usePresence, type PresenceState } from '@/hooks/usePresence'
import { useViewport } from '@/hooks/useViewport'
import { getMotion, motionMs } from '@/motion/runtime'
import { onTick } from '@/motion/ticker'
import { locateWork } from '@/motion/travel'
import { useArchiveStore } from '@/store/archiveStore'
import { useUiStore } from '@/store/uiStore'
import type { ID } from '@/types/archive'
import { cssVars } from '@/utils/css'
import { ProjectHero } from './ProjectHero'
import { SharedCover } from './SharedCover'
import { Timeline } from './Timeline'
import './project.css'

/** 출발점이 없을 때 화면 가운데에서 열리는 창의 크기(화면 대비 비율) */
const CENTER_OPENING = 0.16
/** 이 위를 더블클릭하면 메인 화면으로 나가지 않는다(누를 것 · 볼 것) */
const NOT_BACKGROUND = 'button, a, input, textarea, select, label, img, video, audio, canvas, [role="button"]'

/**
 * 상세 화면의 배경을 더블클릭하면 메인 화면(전체 보기)으로 부드럽게 나간다.
 * 글을 더블클릭해 단어를 고른 경우와 버튼 · 링크 · 이미지 · 영상 위는 그대로 둔다.
 */
function isBackgroundDoubleClick(event: React.MouseEvent): boolean {
  const target = event.target
  if (target instanceof Element && target.closest(NOT_BACKGROUND)) return false
  return !window.getSelection()?.toString().trim()
}

interface ProjectDetailProps {
  projectId: ID
  state: PresenceState
}

function ProjectDetail({ projectId, state }: ProjectDetailProps) {
  const nav = useArchiveNav()
  const route = useArchiveRoute()
  const viewport = useViewport()
  const origin = useUiStore((s) => s.travelOrigin)
  const pageRef = useRef<HTMLElement>(null)
  const ready = useArchiveStore((s) => s.status === 'ready')
  const project = useArchiveStore((s) => s.projects.find((item) => item.id === projectId))
  const category = useArchiveStore((s) => s.categories.find((item) => item.id === project?.categoryId))
  const handoffDelay = Math.round(motionMs(projectMotion.approach) * projectMotion.handoffAt)
  // 이미지 없는 작품: 카메라가 다가가는 동안은 닫아 두었다가, 다 와 갈 즈음 그 작품이 보이는 자리에서 창이 열린다
  const [openedFromWork] = useState(
    () => state === 'closed' && origin !== null && !origin.src && getMotion().intensity > 0,
  )
  const [handoff, setHandoff] = useState<'waiting' | 'done'>(openedFromWork ? 'waiting' : 'done')
  useEffect(() => {
    const page = pageRef.current
    if (handoff !== 'waiting' || !page) return
    // 기다리는 동안 창의 시작 자리(--from-*)가 다가오는 작품을 따라간다(장면이 계산한 자리라 DOM을 재지 않는다).
    // 그래서 여는 순간 이미 작품이 보이는 그 자리에 있다.
    const stop = onTick(() => {
      const rect = locateWork(projectId)
      if (!rect) return
      page.style.setProperty('--from-top', `${rect.y}px`)
      page.style.setProperty('--from-left', `${rect.x}px`)
      page.style.setProperty('--from-right', `${window.innerWidth - rect.x - rect.width}px`)
      page.style.setProperty('--from-bottom', `${window.innerHeight - rect.y - rect.height}px`)
    })
    const timer = window.setTimeout(() => setHandoff('done'), handoffDelay)
    return () => {
      stop()
      window.clearTimeout(timer)
    }
  }, [handoff, handoffDelay, projectId])

  const from = origin ?? {
    x: viewport.width * (0.5 - CENTER_OPENING / 2),
    y: viewport.height * (0.5 - CENTER_OPENING / 2),
    width: viewport.width * CENTER_OPENING,
    height: viewport.height * CENTER_OPENING,
  }

  // 이 작품이 있는 성단으로 돌아가는 중인가. 그때는 대표 이미지가 작품의 자리로 되돌아간다.
  const returning = route.view === 'system' && route.categoryId === project?.categoryId
  // 여는 순간에 정한다: 누른 자리에 이미지가 있었으면 그 이미지를 이어받아 연다
  const [openedShared] = useState(() => state === 'closed' && Boolean(origin?.src) && getMotion().intensity > 0)
  const [coverAway, setCoverAway] = useState(openedShared)
  const onFlying = useCallback((flying: boolean) => setCoverAway(flying), [])

  return (
    <>
      <article
        ref={pageRef}
        className="project"
        data-state={state}
        data-travel={
          openedShared || (returning && getMotion().intensity > 0) ? 'shared' : openedFromWork ? 'work' : 'frame'
        }
        data-handoff={handoff}
        data-cover={coverAway ? 'away' : 'here'}
        // 이 작품의 성단이 아닌 곳(메인 화면 등)으로 나갈 때는 작품 자리로 접히지 않고 그 자리에서 흐려진다
        data-exit={state !== 'open' && !returning ? 'fade' : undefined}
        onDoubleClick={(event) => {
          if (state === 'open' && isBackgroundDoubleClick(event)) nav.toGalaxy()
        }}
        style={cssVars({
          hue: category?.hue,
          // frame 방식: 눌렀던 프레임의 자리에서 화면이 커지며 열린다. 검색이나 주소로 바로 왔다면 화면 가운데에서 연다.
          'handoff-delay': `${handoffDelay}ms`,
          'from-top': `${from.y}px`,
          'from-left': `${from.x}px`,
          'from-right': `${viewport.width - from.x - from.width}px`,
          'from-bottom': `${viewport.height - from.y - from.height}px`,
        })}
      >
        <div className="project__scroll scroll-area" data-scroll-root>
          {project && category ? (
            <>
              <ProjectHero project={project} category={category} />
              <Timeline project={project} />
            </>
          ) : (
            ready && (
              <div className="project__missing">
                <p>이 창작물을 찾을 수 없습니다.</p>
                <Button variant="ghost" onClick={nav.toGalaxy}>
                  전체 보기로 돌아가기
                </Button>
              </div>
            )
          )}
        </div>
      </article>
      <SharedCover
        projectId={projectId}
        state={state}
        pageRef={pageRef}
        origin={origin}
        returning={returning}
        onFlying={onFlying}
      />
    </>
  )
}

/** 프로젝트 상세 화면을 공간 위에 겹쳐 연다. 닫히는 동안에도 마지막 프로젝트를 보여준다. */
export function ProjectLayer() {
  const route = useArchiveRoute()
  const projectId = useLastDefined(route.projectId)
  // 닫힌 뒤에도 이미지가 작품의 자리로 돌아가 자리를 넘길 때까지 남겨 둔다
  const { mounted, state } = usePresence(route.view === 'project', 'travel')
  if (!mounted || !projectId) return null
  return <ProjectDetail key={projectId} projectId={projectId} state={state} />
}
