import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { useUiStore } from '@/store/uiStore'
import { useAddAction } from './useAddAction'

vi.mock('react', async (original) => ({
  ...await original<typeof import('react')>(), useCallback: (callback: unknown) => callback,
}))
vi.mock('./useArchiveRoute', () => ({
  useArchiveRoute: () => ({ view: 'project', projectId: 'project', categoryId: 'category' }),
}))

beforeEach(() => {
  useUiStore.setState({ dialog: null, stagedFiles: [] })
  vi.spyOn(useUiStore.getState(), 'notify').mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

describe('파일 drop 대상', () => {
  it('기존 프로젝트 편집 모드에서는 파일을 staging하지 않고 이유를 안내한다', () => {
    useUiStore.getState().openDialog({ type: 'project', projectId: 'project' })
    useAddAction()([new File(['x'], 'x.txt')])
    expect(useUiStore.getState().stagedFiles).toEqual([])
    expect(useUiStore.getState().notify).toHaveBeenCalledWith(expect.stringContaining('편집에서는 파일을 추가할 수 없습니다'), 'warning')
    expect(useUiStore.getState().dialog).toEqual({ type: 'project', projectId: 'project' })
  })

  it('새 프로젝트와 기록 폼의 기존 파일 추가 동작은 유지한다', () => {
    const file = new File(['x'], 'x.txt')
    for (const dialog of [{ type: 'project' } as const, { type: 'entry', projectId: 'project' } as const]) {
      useUiStore.setState({ dialog, stagedFiles: [] })
      useAddAction()([file])
      expect(useUiStore.getState().stagedFiles).toEqual([file])
      expect(useUiStore.getState().dialog).toEqual(dialog)
    }
  })
})
