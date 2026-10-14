import { ARCHIVE_DB } from '@/config/app'
import { SEED_ART_VERSION, createSeed, refreshSeedArt } from '@/data/seed'
import type { ArchiveSnapshot, Category, ID, Project } from '@/types/archive'
import { allMedia, storedMediaKeys } from '@/utils/project'
import { StorageError, type ArchiveRepository } from '../types'
import { scheduleCleanup } from './cleanup'
import { transact } from './db'

const { categories, projects, meta, files } = ARCHIVE_DB.stores
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
    return transact([categories, projects], 'readwrite', (tx, abort) => {
      const request = tx.objectStore(projects).getAll()
      request.onsuccess = () => {
        if ((request.result as Project[]).some((project) => project.categoryId === id)) {
          abort(new StorageError('창작물이 있는 성단은 지울 수 없습니다.'))
          return
        }
        tx.objectStore(categories).delete(id)
      }
    })
  }

  async saveProject(project: Project): Promise<void> {
    await this.mutateProject(project.id, () => project)
  }

  async deleteProject(id: ID): Promise<void> {
    await this.mutateProject(id, () => undefined)
  }

  async mutateProject(
    id: ID,
    change: (current: Project | undefined) => Project | undefined,
  ): Promise<Project | undefined> {
    let next: Project | undefined
    // 다른 탭의 편집·성단 삭제·파일 정리도 이 store 집합의 트랜잭션과 직렬화된다.
    await transact([projects, categories, files, meta], 'readwrite', (tx, abort) => {
      const request = tx.objectStore(projects).get(id)
      request.onsuccess = () => {
        try {
          const current = request.result as Project | undefined
          next = change(current)
          const before = current ? storedMediaKeys(allMedia(current)) : []
          const after = next ? storedMediaKeys(allMedia(next)) : []
          const commit = () => {
            try {
              if (next) tx.objectStore(projects).put(next)
              else tx.objectStore(projects).delete(id)
              scheduleCleanup(tx, before.filter((key) => !after.includes(key)), abort)
            } catch (error) {
              abort(error)
            }
          }
          if (!next) {
            commit()
            return
          }
          if (next.id !== id) throw new StorageError('프로젝트 ID를 바꿀 수 없습니다.')
          const category = tx.objectStore(categories).getKey(next.categoryId)
          category.onsuccess = () => {
            if (category.result === undefined) {
              abort(new StorageError('성단이 없어 저장하지 못했습니다. 성단을 다시 선택해 주세요.'))
              return
            }
            // 새 참조만 확인한다. 파일 정리와 동시에 실행되어도 없는 파일을 연결하지 않는다.
            const added = after.filter((key) => !before.includes(key))
            let remaining = added.length
            if (remaining === 0) {
              commit()
              return
            }
            for (const key of added) {
              const file = tx.objectStore(files).getKey(key)
              file.onsuccess = () => {
                if (file.result === undefined) {
                  abort(new StorageError('파일이 없어 기록을 저장하지 못했습니다. 다시 시도해 주세요.'))
                  return
                }
                if (--remaining === 0) commit()
              }
            }
          }
        } catch (error) {
          abort(error)
        }
      }
    })
    return next
  }

  /** 비운 뒤에는 샘플을 다시 넣지 않는다(seeded 표시는 남긴다). */
  clear(): Promise<void> {
    return transact([categories, projects, files, meta], 'readwrite', (tx, abort) => {
      const request = tx.objectStore(files).getAllKeys()
      request.onsuccess = () => scheduleCleanup(tx, request.result as string[], abort)
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
