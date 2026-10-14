import { useState } from 'react'
import { useArchiveNav } from '@/app/useArchiveRoute'
import { ConfirmButton } from '@/components/form/ConfirmButton'
import { Field } from '@/components/form/Field'
import { HuePicker } from '@/components/form/HuePicker'
import { DEFAULT_STAR_HUE } from '@/config/catalog'
import { useArchiveStore } from '@/store/archiveStore'
import type { ID } from '@/types/archive'
import { FormShell } from './FormShell'
import { useSubmit } from './useSubmit'

interface CategoryFormProps {
  /** 있으면 편집, 없으면 새 성단 */
  categoryId?: ID
  onClose: () => void
}

/** 성단(카테고리) 추가 · 편집. 창작물이 남아 있는 성단은 지울 수 없다. */
export function CategoryForm({ categoryId, onClose }: CategoryFormProps) {
  const nav = useArchiveNav()
  const category = useArchiveStore((state) => state.categories.find((item) => item.id === categoryId))
  const isEmpty = useArchiveStore((state) => !state.projects.some((project) => project.categoryId === categoryId))
  const { busy, error, submit } = useSubmit()

  const [name, setName] = useState(category?.name ?? '')
  const [description, setDescription] = useState(category?.description ?? '')
  const [hue, setHue] = useState<number>(category?.hue ?? DEFAULT_STAR_HUE)

  const save = () =>
    submit('저장 중', async () => {
      if (!name.trim()) return '이름을 적어 주세요.'
      const saved = await useArchiveStore
        .getState()
        .saveCategory({ name: name.trim(), description: description.trim(), hue }, category?.id)
      onClose()
      if (!category) nav.toSystem(saved.id)
    })

  const remove = () =>
    submit('지우는 중', async () => {
      if (!category) return
      await useArchiveStore.getState().deleteCategory(category.id)
      onClose()
      nav.toGalaxy()
    })

  return (
    <FormShell
      onSubmit={save}
      onCancel={onClose}
      busy={busy}
      error={error}
      submitLabel={category ? '저장' : '성단 만들기'}
      aside={
        category && (
          <ConfirmButton
            label={isEmpty ? '성단 지우기' : '창작물이 있어 지울 수 없음'}
            confirmLabel="한 번 더 누르면 지워집니다"
            onConfirm={remove}
            disabled={!isEmpty || busy !== null}
          />
        )
      }
    >
      <Field label="이름" htmlFor="category-name" hint="예: Game, Web, AI Photo, Music">
        <input
          id="category-name"
          className="input"
          value={name}
          data-autofocus
          onChange={(event) => setName(event.target.value)}
        />
      </Field>
      <Field label="설명" htmlFor="category-description">
        <input
          id="category-description"
          className="input"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </Field>
      <Field label="성단의 색" htmlFor="category-hue">
        <HuePicker id="category-hue" value={hue} onChange={setHue} />
      </Field>
    </FormShell>
  )
}
