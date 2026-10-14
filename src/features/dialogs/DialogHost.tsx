import { Fragment, type ReactNode } from 'react'
import { Dialog, type DialogVariant } from '@/components/Dialog'
import { CategoryForm } from '@/features/editor/CategoryForm'
import { EntryForm } from '@/features/editor/EntryForm'
import { ProjectForm } from '@/features/editor/ProjectForm'
import { MediaViewer } from '@/features/media/MediaViewer'
import { SearchPalette } from '@/features/search/SearchPalette'
import { SettingsPanel } from '@/features/settings/SettingsPanel'
import { useLastDefined } from '@/hooks/usePresence'
import { useUiStore } from '@/store/uiStore'
import type { DialogDescriptor } from '@/types/ui'

interface DialogView {
  variant: DialogVariant
  label: string
  /** 다른 대상을 열면 내용의 상태를 새로 시작하게 하는 key */
  key: string
  body: ReactNode
}

/** store의 dialog 값 → 실제 창. 새 종류의 창은 DialogDescriptor와 여기 한 곳에 추가한다. */
function describe(dialog: DialogDescriptor, close: () => void): DialogView {
  switch (dialog.type) {
    case 'search':
      return { variant: 'palette', label: '검색', key: 'search', body: <SearchPalette onClose={close} /> }
    case 'settings':
      return { variant: 'drawer', label: '설정', key: 'settings', body: <SettingsPanel onClose={close} /> }
    case 'project':
      return {
        variant: 'modal',
        label: dialog.projectId ? '창작물 편집' : '새 창작물',
        key: `project-${dialog.projectId ?? 'new'}`,
        body: <ProjectForm projectId={dialog.projectId} categoryId={dialog.categoryId} onClose={close} />,
      }
    case 'entry':
      return {
        variant: 'modal',
        label: dialog.entryId ? '기록 편집' : '새 기록',
        key: `entry-${dialog.entryId ?? 'new'}`,
        body: <EntryForm projectId={dialog.projectId} entryId={dialog.entryId} onClose={close} />,
      }
    case 'category':
      return {
        variant: 'modal',
        label: dialog.categoryId ? '성단 편집' : '새 성단',
        key: `category-${dialog.categoryId ?? 'new'}`,
        body: <CategoryForm categoryId={dialog.categoryId} onClose={close} />,
      }
    case 'viewer':
      return {
        variant: 'viewer',
        label: '미디어 보기',
        key: `viewer-${dialog.items[dialog.index]?.id}`,
        body: <MediaViewer items={dialog.items} index={dialog.index} onClose={close} />,
      }
  }
}

/** 한 번에 하나의 창만 연다. 닫히는 동안에는 마지막 내용을 그대로 보여준다. */
export function DialogHost() {
  const dialog = useUiStore((state) => state.dialog)
  const close = useUiStore((state) => state.closeDialog)
  const shown = useLastDefined(dialog)
  if (!shown) return null

  const view = describe(shown, close)
  return (
    <Dialog open={dialog !== null} onClose={close} variant={view.variant} label={view.label}>
      <Fragment key={view.key}>{view.body}</Fragment>
    </Dialog>
  )
}
