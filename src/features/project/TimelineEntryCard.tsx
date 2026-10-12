import { ExternalLink, Pencil } from 'lucide-react'
import { IconButton } from '@/components/Button'
import { MediaGallery } from '@/features/media/MediaGallery'
import { Reveal } from '@/motion/Reveal'
import { useUiStore } from '@/store/uiStore'
import type { ID, TimelineEntry } from '@/types/archive'
import { formatDate } from '@/utils/format'

interface TimelineEntryCardProps {
  projectId: ID
  entry: TimelineEntry
}

/** 개발 기록 한 건: 날짜 → 그때의 장면 → 그때의 생각 */
export function TimelineEntryCard({ projectId, entry }: TimelineEntryCardProps) {
  const openDialog = useUiStore((state) => state.openDialog)

  return (
    <li className="entry">
      <span className="entry__node" aria-hidden="true" />
      {/* 날짜는 PC에서 선의 왼쪽에 놓이므로 본문과 따로 둔다 */}
      <Reveal className="entry__date">
        <time dateTime={entry.date}>{formatDate(entry.date)}</time>
      </Reveal>
      <Reveal variant="blur" className="entry__content">
        <header className="entry__header">
          <h3 className="entry__title">{entry.title}</h3>
          {entry.version && <span className="entry__version">{entry.version}</span>}
          <IconButton
            className="entry__edit"
            icon={Pencil}
            label={`${entry.title} 편집`}
            variant="quiet"
            size="sm"
            onClick={() => openDialog({ type: 'entry', projectId, entryId: entry.id })}
          />
        </header>

        <MediaGallery assets={entry.media} />

        {entry.memo && <blockquote className="entry__memo">{entry.memo}</blockquote>}

        {entry.tech.length > 0 && (
          <ul className="entry__tech" aria-label="사용 기술">
            {entry.tech.map((tech) => (
              <li key={tech} className="chip">
                {tech}
              </li>
            ))}
          </ul>
        )}

        {entry.links.length > 0 && (
          <ul className="entry__links">
            {entry.links.map((link) => (
              <li key={link.id}>
                <a className="text-link" href={link.url} target="_blank" rel="noreferrer">
                  {link.label}
                  <ExternalLink aria-hidden="true" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </Reveal>
    </li>
  )
}
