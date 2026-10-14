import { ARCHIVE_DB } from '@/config/app'
import { SEED_ART_VERSION, createSeed, refreshSeedArt } from '@/data/seed'
import type { ArchiveSnapshot, Category, ID, Project } from '@/types/archive'
import type { ArchiveRepository } from '../types'
import { transact } from './db'

const { categories, projects, meta } = ARCHIVE_DB.stores
const SEEDED_KEY = 'seeded'
const SEED_ART_KEY = 'seedArtVersion'

/** 이 브라우저의 IndexedDB에 저장한다. 첫 실행 때만 샘플 기록을 넣는다. */
export class LocalArchiveRepository implements ArchiveRepository {
  async load(): Promise<ArchiveSnapshot> {
    const seeded = await transact<boolean | undefined>([meta], 'readonly', (tx) => tx.objectStore(meta).get(SEEDED_KEY))
    if (!seeded) await this.writeSeed()

    const [categoryRows, projectRows] = await Promise.all([
      transact<Category[]>([categories], 'readonly', (tx) => tx.objectStore(categories).getAll()),
      transact<Project[]>([projects], 'readonly', (tx) => tx.objectStore(projects).getAll()),
    ])
    return { categories: categoryRows, projects: await this.refreshSeedArt(categoryRows, projectRows) }
  }

  getProject(id: ID): Promise<Project | undefined> {
    return transact<Project | undefined>([projects], 'readonly', (tx) => tx.objectStore(projects).get(id))
  }

  saveCategory(category: Category): Promise<void> {
    return transact([categories], 'readwrite', (tx) => void tx.objectStore(categories).put(category))
  }

  deleteCategory(id: ID): Promise<void> {
    return transact([categories], 'readwrite', (tx) => void tx.objectStore(categories).delete(id))
  }

  saveProject(project: Project): Promise<void> {
    return transact([projects], 'readwrite', (tx) => void tx.objectStore(projects).put(project))
  }

  deleteProject(id: ID): Promise<void> {
    return transact([projects], 'readwrite', (tx) => void tx.objectStore(projects).delete(id))
  }

  /** 비운 뒤에는 샘플을 다시 넣지 않는다(seeded 표시는 남긴다). */
  clear(): Promise<void> {
    return transact([categories, projects], 'readwrite', (tx) => {
      tx.objectStore(categories).clear()
      tx.objectStore(projects).clear()
    })
  }

  private writeSeed(): Promise<void> {
    const seed = createSeed()
    return transact([categories, projects, meta], 'readwrite', (tx) => {
      for (const category of seed.categories) tx.objectStore(categories).put(category)
      for (const project of seed.projects) tx.objectStore(projects).put(project)
      tx.objectStore(meta).put(true, SEEDED_KEY)
      tx.objectStore(meta).put(SEED_ART_VERSION, SEED_ART_KEY)
    })
  }

  /** 샘플 그림의 디자인이 바뀌었으면, 남아 있는 샘플의 그림만 새로 그려 저장한다. */
  private async refreshSeedArt(categoryRows: Category[], projectRows: Project[]): Promise<Project[]> {
    const version = await transact<number | undefined>([meta], 'readonly', (tx) => tx.objectStore(meta).get(SEED_ART_KEY))
    if (version === SEED_ART_VERSION) return projectRows

    const hueOf = new Map(categoryRows.map((category) => [category.id, category.hue]))
    const refreshed = projectRows.map((project) => refreshSeedArt(project, hueOf.get(project.categoryId) ?? 0))
    await transact([projects, meta], 'readwrite', (tx) => {
      for (const project of refreshed) if (project) tx.objectStore(projects).put(project)
      tx.objectStore(meta).put(SEED_ART_VERSION, SEED_ART_KEY)
    })
    return projectRows.map((project, index) => refreshed[index] ?? project)
  }
}
