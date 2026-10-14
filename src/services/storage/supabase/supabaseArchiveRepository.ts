import { REMOTE } from '@/config/app'
import type { ArchiveSnapshot, Category, ID, Project } from '@/types/archive'
import type { ArchiveRepository } from '../types'
import { supabase, throwIfError } from './client'

const { categories, projects } = REMOTE.tables

interface CategoryRow {
  id: string
  name: string
  description: string
  hue: number
  created_at: string
}

/**
 * Supabase Database 구현체. 행의 소유자(owner)는 DB가 로그인한 사용자로 채우고,
 * 본인 행만 읽고 쓰게 하는 규칙(RLS)은 supabase/schema.sql에 있다.
 * 프로젝트는 타임라인을 포함한 문서 전체를 data(jsonb) 한 칸에 둔다.
 */
export class SupabaseArchiveRepository implements ArchiveRepository {
  async load(): Promise<ArchiveSnapshot> {
    const [categoryResult, projectResult] = await Promise.all([
      supabase().from(categories).select('id, name, description, hue, created_at'),
      supabase().from(projects).select('data'),
    ])
    throwIfError(categoryResult.error)
    throwIfError(projectResult.error)
    return {
      categories: ((categoryResult.data ?? []) as CategoryRow[]).map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        hue: row.hue,
        createdAt: row.created_at,
      })),
      projects: (projectResult.data ?? []).map((row) => row.data as Project),
    }
  }

  async getProject(id: ID): Promise<Project | undefined> {
    const { data, error } = await supabase().from(projects).select('data').eq('id', id).maybeSingle()
    throwIfError(error)
    return (data?.data as Project | undefined) ?? undefined
  }

  async saveCategory(category: Category): Promise<void> {
    const row: CategoryRow = {
      id: category.id,
      name: category.name,
      description: category.description,
      hue: category.hue,
      created_at: category.createdAt,
    }
    const { error } = await supabase().from(categories).upsert(row)
    throwIfError(error)
  }

  async deleteCategory(id: ID): Promise<void> {
    const { error } = await supabase().from(categories).delete().eq('id', id)
    throwIfError(error)
  }

  async saveProject(project: Project): Promise<void> {
    const { error } = await supabase()
      .from(projects)
      .upsert({ id: project.id, category_id: project.categoryId, data: project, updated_at: project.updatedAt })
    throwIfError(error)
  }

  async deleteProject(id: ID): Promise<void> {
    const { error } = await supabase().from(projects).delete().eq('id', id)
    throwIfError(error)
  }

  /** 규칙(RLS)이 본인 행으로 제한하므로 조건 없이 지워도 내 기록만 지워진다. */
  async clear(): Promise<void> {
    const projectResult = await supabase().from(projects).delete().neq('id', '')
    throwIfError(projectResult.error)
    const categoryResult = await supabase().from(categories).delete().neq('id', '')
    throwIfError(categoryResult.error)
  }
}
