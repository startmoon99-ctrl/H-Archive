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
  status: 'loading' | 'ready' | 'error'
  error: string | null
  categories: Category[]
  projects: Project[]

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

  let started = false

  return {
    status: 'loading',
    error: null,
    categories: [],
    projects: [],

    async init() {
      // StrictMode의 이중 호출에도 한 번만 불러온다
      if (started) return
      started = true
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
