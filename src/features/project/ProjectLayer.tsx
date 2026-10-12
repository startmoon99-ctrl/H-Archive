import { useArchiveNav, useArchiveRoute } from '@/app/useArchiveRoute'
import { Button } from '@/components/Button'
import { useLastDefined, usePresence, type PresenceState } from '@/hooks/usePresence'
import { useViewport } from '@/hooks/useViewport'
import { useArchiveStore } from '@/store/archiveStore'
import { useUiStore } from '@/store/uiStore'
import type { ID } from '@/types/archive'
import { cssVars } from '@/utils/css'
import { ProjectHero } from './ProjectHero'
import { Timeline } from './Timeline'
import './project.css'

interface ProjectDetailProps {
  projectId: ID
  state: PresenceState
}

function ProjectDetail({ projectId, state }: ProjectDetailProps) {
  const nav = useArchiveNav()
  const viewport = useViewport()
  const origin = useUiStore((s) => s.travelOrigin?.screen)
  const ready = useArchiveStore((s) => s.status === 'ready')
  const project = useArchiveStore((s) => s.projects.find((item) => item.id === projectId))
  const category = useArchiveStore((s) => s.categories.find((item) => item.id === project?.categoryId))

  return (
    <article
      className="project"
      data-state={state}
      style={cssVars({
        hue: category?.hue,
        // 눌렀던 행성 자리에서 화면이 열린다. 검색이나 주소로 바로 왔다면 가운데에서 연다.
        'origin-x': `${origin?.x ?? viewport.width / 2}px`,
        'origin-y': `${origin?.y ?? viewport.height / 2}px`,
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
                은하로 돌아가기
              </Button>
            </div>
          )
        )}
      </div>
    </article>
  )
}

/** 프로젝트 상세 화면을 은하 위에 겹쳐 연다. 닫히는 동안에도 마지막 프로젝트를 보여준다. */
export function ProjectLayer() {
  const route = useArchiveRoute()
  const projectId = useLastDefined(route.projectId)
  const { mounted, state } = usePresence(route.view === 'project', 'slow')
  if (!mounted || !projectId) return null
  return <ProjectDetail key={projectId} projectId={projectId} state={state} />
}
