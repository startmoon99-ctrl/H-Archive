import { create } from 'zustand'
import {
  archiveService,
  type CategoryDraft,
  type EntryDraft,
  type ProgressFn,
  type ProjectDraft,
  type ProjectPatch,
  type SaveResult,
} from '@/services/archiveService'
import type { Category, ID, Project } from '@/types/archive'

interface ArchiveState {
  /** idle → loading → ready, 실패하면 error. error에서 init을 다시 부르면 처음부터 다시 불러온다. */
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
  categories: Category[]
  projects: Project[]

  /** 기록을 불러온다. 이미 불러왔거나 불러오는 중이면 새로 시작하지 않는다. */
  init: () => Promise<void>
  saveCategory: (draft: CategoryDraft, id?: ID) => Promise<Category>
  deleteCategory: (id: ID) => Promise<void>
  createProject: (draft: ProjectDraft, files: File[], onProgress?: ProgressFn) => Promise<SaveResult>
  updateProject: (id: ID, patch: ProjectPatch) => Promise<void>
  deleteProject: (id: ID) => Promise<void>
  saveEntry: (projectId: ID, draft: EntryDraft, files: File[], onProgress?: ProgressFn) => Promise<SaveResult>
  deleteEntry: (projectId: ID, entryId: ID) => Promise<void>
  clearAll: () => Promise<void>
}

function upsert<T extends { id: ID }>(list: T[], item: T): T[] {
  return list.some((existing) => existing.id === item.id)
    ? list.map((existing) => (existing.id === item.id ? item : existing))
    : [...list, item]
}

export const useArchiveStore = create<ArchiveState>((set, get) => {
  const putProject = (project: Project) => set((state) => ({ projects: upsert(state.projects, project) }))
  const requireProject = (id: ID): Project => {
    const project = get().projects.find((item) => item.id === id)
    if (!project) throw new Error('프로젝트를 찾을 수 없습니다.')
    return project
  }

  /** 진행 중인 불러오기. 겹친 호출(StrictMode의 이중 호출 포함)은 새로 시작하지 않고 이것을 함께 기다린다. */
  let loading: Promise<void> | null = null

  const load = async () => {
    set({ status: 'loading', error: null })
    try {
      const snapshot = await archiveService.load()
      set({ ...snapshot, status: 'ready', error: null })
      // Preview 생성처럼 백그라운드에서 바뀐 프로젝트를 반영한다
      archiveService.subscribe((project) => {
        if (get().projects.some((item) => item.id === project.id)) putProject(project)
      })
    } catch (error) {
      set({ status: 'error', error: error instanceof Error ? error.message : '불러오지 못했습니다.' })
    }
  }

  return {
    status: 'idle',
    error: null,
    categories: [],
    projects: [],

    init() {
      if (get().status === 'ready') return Promise.resolve()
      loading ??= load().finally(() => {
        loading = null
      })
      return loading
    },

    async saveCategory(draft, id) {
      const existing = get().categories.find((category) => category.id === id)
      const category = await archiveService.saveCategory(draft, existing)
      set((state) => ({ categories: upsert(state.categories, category) }))
      return category
    },

    async deleteCategory(id) {
      await archiveService.removeCategory(id)
      set((state) => ({ categories: state.categories.filter((category) => category.id !== id) }))
    },

    async createProject(draft, files, onProgress) {
      const result = await archiveService.createProject(draft, files, onProgress)
      putProject(result.project)
      return result
    },

    async updateProject(id, patch) {
      putProject(await archiveService.updateProject(requireProject(id), patch))
    },

    async deleteProject(id) {
      await archiveService.removeProject(requireProject(id))
      set((state) => ({ projects: state.projects.filter((project) => project.id !== id) }))
    },

    async saveEntry(projectId, draft, files, onProgress) {
      const result = await archiveService.saveEntry(requireProject(projectId), draft, files, onProgress)
      putProject(result.project)
      return result
    },

    async deleteEntry(projectId, entryId) {
      putProject(await archiveService.removeEntry(requireProject(projectId), entryId))
    },

    async clearAll() {
      await archiveService.clearAll()
      set({ categories: [], projects: [] })
    },
  }
})
