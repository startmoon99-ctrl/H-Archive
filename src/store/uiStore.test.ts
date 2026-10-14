import { beforeEach, describe, expect, it, vi } from 'vitest'
import { deferred } from '@/test/archiveFixtures'
import { useUiStore } from './uiStore'

beforeEach(() => useUiStore.setState({ dialog: null, stagedFiles: [], dialogId: 0 }))

describe('dialog instance', () => {
  it('닫은 폼 A의 저장 완료는 새 폼 B와 첨부 파일/경로를 변경하지 않는다', async () => {
    const ui = useUiStore.getState()
    ui.openDialog({ type: 'project' })
    const instance = useUiStore.getState().dialogId
    const pending = deferred<void>()
    const navigate = vi.fn()
    const finished = pending.promise.then(() => {
      if (ui.closeDialog(instance)) navigate()
    })
    ui.closeDialog()
    ui.openDialog({ type: 'entry', projectId: 'other' })
    const file = new File(['next'], 'next.txt')
    ui.stageFiles([file])
    pending.resolve()
    await finished
    expect(useUiStore.getState().dialog).toEqual({ type: 'entry', projectId: 'other' })
    expect(useUiStore.getState().stagedFiles).toEqual([file])
    expect(navigate).not.toHaveBeenCalled()
  })

  it('같은 종류의 폼을 즉시 다시 열어도 이전 인스턴스가 닫을 수 없다', () => {
    const ui = useUiStore.getState()
    ui.openDialog({ type: 'project' })
    const previous = useUiStore.getState().dialogId
    ui.closeDialog()
    ui.openDialog({ type: 'project' })
    expect(ui.closeDialog(previous)).toBe(false)
    expect(ui.closeDialog(useUiStore.getState().dialogId)).toBe(true)
  })
})
