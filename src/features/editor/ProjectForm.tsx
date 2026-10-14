import { useMemo, useState } from 'react'
import { useArchiveNav } from '@/app/useArchiveRoute'
import { ChipInput } from '@/components/form/ChipInput'
import { ConfirmButton } from '@/components/form/ConfirmButton'
import { Field, FieldRow } from '@/components/form/Field'
import { HuePicker } from '@/components/form/HuePicker'
import { LinkListInput, cleanLinks } from '@/components/form/LinkListInput'
import {
  DEFAULT_PROJECT_STATUS,
  DEFAULT_STAR_HUE,
  PROJECT_STATUSES,
  type ProjectStatusId,
} from '@/config/catalog'
import { FileStaging } from '@/features/upload/FileStaging'
import { useArchiveStore } from '@/store/archiveStore'
import { useUiStore } from '@/store/uiStore'
import type { ID } from '@/types/archive'
import { baseName, todayISO } from '@/utils/format'
import { FormShell } from './FormShell'
import { useSubmit } from './useSubmit'

const NEW_CATEGORY = '__new__'

interface ProjectFormProps {
  /** 있으면 편집, 없으면 새 창작물 */
  projectId?: ID
  /** 새 창작물에 미리 골라 둘 성단 */
  categoryId?: ID
  onClose: () => boolean
}

/**
 * 창작물 추가 · 편집. 추가할 때는 올려 둔 파일과 '그때의 생각'이 첫 기록이 되고,
 * 저장하면 그 성단으로 이동해 새 작품이 나타나는 장면으로 이어진다.
 */
export function ProjectForm({ projectId, categoryId, onClose }: ProjectFormProps) {
  const nav = useArchiveNav()
  const storedCategories = useArchiveStore((state) => state.categories)
  // 공간에 놓인 순서(만든 순서)대로 고르게 한다
  const categories = useMemo(
    () => [...storedCategories].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [storedCategories],
  )
  const project = useArchiveStore((state) => state.projects.find((item) => item.id === projectId))
  const files = useUiStore((state) => state.stagedFiles)
  const setStagedFiles = useUiStore((state) => state.setStagedFiles)
  const { busy, error, submit } = useSubmit()

  const [title, setTitle] = useState(project?.title ?? '')
  const [titleEdited, setTitleEdited] = useState(Boolean(project))
  const [category, setCategory] = useState(project?.categoryId ?? categoryId ?? categories[0]?.id ?? NEW_CATEGORY)
  const [newName, setNewName] = useState('')
  const [newHue, setNewHue] = useState<number>(DEFAULT_STAR_HUE)
  const [description, setDescription] = useState(project?.description ?? '')
  const [startedAt, setStartedAt] = useState(project?.startedAt ?? todayISO())
  const [status, setStatus] = useState<ProjectStatusId>(project?.status ?? DEFAULT_PROJECT_STATUS)
  const [tags, setTags] = useState(project?.tags ?? [])
  const [links, setLinks] = useState(project?.links ?? [])
  const [memo, setMemo] = useState('')

  // 제목을 직접 적기 전에는 첫 파일의 이름을 제목으로 제안한다
  const shownTitle = titleEdited ? title : files[0] ? baseName(files[0].name) : ''

  const save = () =>
    submit('저장 중', async (progress) => {
      const finalTitle = shownTitle.trim()
      if (!finalTitle) return '제목을 적어 주세요.'
      const store = useArchiveStore.getState()

      let targetCategory = category
      if (category === NEW_CATEGORY) {
        if (!newName.trim()) return '새 성단의 이름을 적어 주세요.'
        targetCategory = (await store.saveCategory({ name: newName.trim(), description: '', hue: newHue })).id
        setCategory(targetCategory)
      }
      const fields = {
        title: finalTitle,
        categoryId: targetCategory,
        description: description.trim(),
        status,
        startedAt,
        tags,
        links: cleanLinks(links),
      }

      if (project) {
        await store.updateProject(project.id, fields)
        onClose()
        return
      }
      const result = await store.createProject({ ...fields, firstMemo: memo.trim() }, files, (step) =>
        progress(`${step.label} (${step.current}/${step.total})`),
      )
      const ui = useUiStore.getState()
      if (onClose()) {
        for (const warning of result.warnings) ui.notify(warning, 'warning')
        ui.setBornProject(result.project.id)
        nav.toSystem(targetCategory)
      }
    })

  const remove = () =>
    submit('지우는 중', async () => {
      if (!project) return
      await useArchiveStore.getState().deleteProject(project.id)
      if (onClose()) nav.toSystem(project.categoryId)
    })

  return (
    <FormShell
      onSubmit={save}
      onCancel={onClose}
      busy={busy}
      error={error}
      submitLabel={project ? '저장' : '공간에 추가'}
      aside={
        project && (
          <ConfirmButton
            label="창작물 지우기"
            confirmLabel="기록과 파일이 모두 지워집니다. 한 번 더 누르기"
            onConfirm={remove}
            disabled={busy !== null}
          />
        )
      }
    >
      {!project && (
        <Field label="파일">
          <FileStaging files={files} onChange={setStagedFiles} />
        </Field>
      )}

      <Field label="제목" htmlFor="project-title">
        <input
          id="project-title"
          className="input"
          value={shownTitle}
          placeholder="무엇을 만들었나요"
          data-autofocus
          onChange={(event) => {
            setTitle(event.target.value)
            setTitleEdited(true)
          }}
        />
      </Field>

      <FieldRow>
        <Field label="성단" htmlFor="project-category">
          <select
            id="project-category"
            className="input"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            {categories.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
            <option value={NEW_CATEGORY}>새 성단 만들기…</option>
          </select>
        </Field>
        <Field label="시작한 날" htmlFor="project-date">
          <input
            id="project-date"
            className="input"
            type="date"
            value={startedAt}
            required
            onChange={(event) => setStartedAt(event.target.value)}
          />
        </Field>
      </FieldRow>

      {category === NEW_CATEGORY && (
        <div className="form-shell__group">
          <Field label="새 성단 이름" htmlFor="project-new-category" hint="예: Game, Music, 글">
            <input
              id="project-new-category"
              className="input"
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
            />
          </Field>
          <Field label="성단의 색" htmlFor="project-new-hue">
            <HuePicker id="project-new-hue" value={newHue} onChange={setNewHue} />
          </Field>
        </div>
      )}

      <Field label="한 줄 설명" htmlFor="project-description">
        <input
          id="project-description"
          className="input"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>

      {!project && (
        <Field label="그때의 생각" htmlFor="project-memo" hint="첫 기록에 남습니다. 나중에 읽을 나에게 쓰는 메모.">
          <textarea
            id="project-memo"
            className="input"
            data-style="memo"
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
          />
        </Field>
      )}

      <FieldRow>
        <Field label="상태" htmlFor="project-status">
          <select
            id="project-status"
            className="input"
            value={status}
            onChange={(event) => setStatus(event.target.value as ProjectStatusId)}
          >
            {PROJECT_STATUSES.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="태그" htmlFor="project-tags">
          <ChipInput id="project-tags" value={tags} onChange={setTags} placeholder="Enter로 추가" />
        </Field>
      </FieldRow>

      <Field label="링크">
        <LinkListInput value={links} onChange={setLinks} />
      </Field>
    </FormShell>
  )
}
