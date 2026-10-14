import { useCallback } from 'react'
import { useUiStore } from '@/store/uiStore'
import { useArchiveRoute } from './useArchiveRoute'

/**
 * "추가"가 뜻하는 일을 지금 위치에 맞춘다.
 * 프로젝트 안에서는 새 기록, 그 밖에서는 새 창작물(성단 안이면 그 성단이 선택된 채로).
 * 이미 추가 폼이 열려 있으면 파일만 그 폼에 더한다. + 버튼과 Drag & Drop이 함께 쓴다.
 */
export function useAddAction(): (files?: File[]) => void {
  const route = useArchiveRoute()

  return useCallback(
    (files = []) => {
      const ui = useUiStore.getState()
      ui.stageFiles(files)
      const formOpen = ui.dialog?.type === 'project' || ui.dialog?.type === 'entry'
      if (formOpen && files.length > 0) return

      if (route.view === 'project' && route.projectId && route.categoryId) {
        ui.openDialog({ type: 'entry', projectId: route.projectId })
      } else {
        ui.openDialog({ type: 'project', categoryId: route.categoryId ?? undefined })
      }
    },
    [route],
  )
}
