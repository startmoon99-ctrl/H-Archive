import { useState } from 'react'
import { Star, X } from 'lucide-react'
import { IconButton } from '@/components/Button'
import { ChipInput } from '@/components/form/ChipInput'
import { ConfirmButton } from '@/components/form/ConfirmButton'
import { Field, FieldRow } from '@/components/form/Field'
import { LinkListInput, cleanLinks } from '@/components/form/LinkListInput'
import { MediaPreview } from '@/features/media/MediaPreview'
import { FileStaging } from '@/features/upload/FileStaging'
import { useArchiveStore } from '@/store/archiveStore'
import { useUiStore } from '@/store/uiStore'
import type { ID } from '@/types/archive'
import { todayISO } from '@/utils/format'
import { isVisual } from '@/utils/project'
import { FormShell } from './FormShell'
import { useSubmit } from './useSubmit'

interface EntryFormProps {
  projectId: ID
  /** 있으면 편집, 없으면 새 기록 */
  entryId?: ID
  onClose: () => void
}

/** 개발 기록 추가 · 편집: 그날 무엇을 만들었고 무슨 생각을 했는지 */
export function EntryForm({ projectId, entryId, onClose }: EntryFormProps) {
  const project = useArchiveStore((state) => state.projects.find((item) => item.id === projectId))
  const entry = project?.timeline.find((item) => item.id === entryId)
  const files = useUiStore((state) => state.stagedFiles)
  const setStagedFiles = useUiStore((state) => state.setStagedFiles)
  const { busy, error, submit } = useSubmit()

  const [date, setDate] = useState(entry?.date ?? todayISO())
  const [title, setTitle] = useState(entry?.title ?? '')
  const [memo, setMemo] = useState(entry?.memo ?? '')
  const [version, setVersion] = useState(entry?.version ?? '')
  const [tech, setTech] = useState(entry?.tech ?? [])
  const [links, setLinks] = useState(entry?.links ?? [])
  const [media, setMedia] = useState(entry?.media ?? [])
  const [coverId, setCoverId] = useState(project?.coverMediaId ?? null)

  const save = () =>
    submit('저장 중', async (progress) => {
      if (!title.trim()) return '제목을 적어 주세요.'
      const store = useArchiveStore.getState()
      const result = await store.saveEntry(
        projectId,
        {
          id: entry?.id,
          date,
          title: title.trim(),
          memo: memo.trim(),
          version: version.trim(),
          tech,
          links: cleanLinks(links),
          media,
        },
        files,
        (step) => progress(`${step.label} (${step.current}/${step.total})`),
      )
      for (const warning of result.warnings) useUiStore.getState().notify(warning, 'warning')
      if (coverId !== result.project.coverMediaId) await store.updateProject(projectId, { coverMediaId: coverId })
      onClose()
    })

  const remove = () =>
    submit('지우는 중', async () => {
      if (!entry) return
      await useArchiveStore.getState().deleteEntry(projectId, entry.id)
      onClose()
    })

  return (
    <FormShell
      onSubmit={save}
      onCancel={onClose}
      busy={busy}
      error={error}
      submitLabel={entry ? '저장' : '기록 남기기'}
      aside={
        entry && (
          <ConfirmButton
            label="기록 지우기"
            confirmLabel="파일도 함께 지워집니다. 한 번 더 누르기"
            onConfirm={remove}
            disabled={busy !== null}
          />
        )
      }
    >
      <FieldRow>
        <Field label="날짜" htmlFor="entry-date">
          <input
            id="entry-date"
            className="input"
            type="date"
            value={date}
            required
            onChange={(event) => setDate(event.target.value)}
          />
        </Field>
        <Field label="버전" htmlFor="entry-version">
          <input
            id="entry-version"
            className="input"
            value={version}
            placeholder="v0.1"
            onChange={(event) => setVersion(event.target.value)}
          />
        </Field>
      </FieldRow>

      <Field label="제목" htmlFor="entry-title">
        <input
          id="entry-title"
          className="input"
          value={title}
          placeholder="첫 프로토타입, 구조 변경 …"
          data-autofocus
          onChange={(event) => setTitle(event.target.value)}
        />
      </Field>

      <Field label="그때의 생각" htmlFor="entry-memo">
        <textarea
          id="entry-memo"
          className="input"
          data-style="memo"
          value={memo}
          onChange={(event) => setMemo(event.target.value)}
        />
      </Field>

      <Field label="이미지 · 영상 · 파일">
        {media.length > 0 && (
          <ul className="form-shell__media">
            {media.map((asset) => (
              <li key={asset.id} className="form-shell__media-item">
                <MediaPreview asset={asset} active={false} />
                <span className="form-shell__media-name">{asset.name}</span>
                {isVisual(asset) && (
                  <IconButton
                    icon={Star}
                    label="대표 미디어로 쓰기"
                    variant={coverId === asset.id ? 'primary' : 'quiet'}
                    size="sm"
                    aria-pressed={coverId === asset.id}
                    onClick={() => setCoverId(coverId === asset.id ? null : asset.id)}
                  />
                )}
                <IconButton
                  icon={X}
                  label={`${asset.name} 빼기`}
                  variant="quiet"
                  size="sm"
                  onClick={() => {
                    setMedia(media.filter((item) => item.id !== asset.id))
                    if (coverId === asset.id) setCoverId(null)
                  }}
                />
              </li>
            ))}
          </ul>
        )}
        <FileStaging files={files} onChange={setStagedFiles} />
      </Field>

      <Field label="사용 기술" htmlFor="entry-tech">
        <ChipInput id="entry-tech" value={tech} onChange={setTech} placeholder="Enter로 추가" />
      </Field>

      <Field label="링크">
        <LinkListInput value={links} onChange={setLinks} />
      </Field>
    </FormShell>
  )
}
