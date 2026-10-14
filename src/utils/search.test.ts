import { describe, expect, it } from 'vitest'
import type { Category, Project, TimelineEntry } from '@/types/archive'
import { searchArchive } from './search'

const category: Category = { id: 'c1', name: 'Game', description: '', hue: 200, createdAt: '2026-01-01T00:00:00.000Z' }

function entry(patch: Partial<TimelineEntry>): TimelineEntry {
  return { id: 'e1', date: '2026-01-01', title: '', memo: '', version: '', tech: [], links: [], media: [], ...patch }
}

function project(patch: Partial<Project>): Project {
  return {
    id: 'p1',
    title: '',
    categoryId: category.id,
    description: '',
    status: 'done',
    startedAt: '2026-01-01',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    coverMediaId: null,
    tags: [],
    links: [],
    timeline: [],
    ...patch,
  } as Project
}

describe('searchArchive', () => {
  const inMemo = project({ id: 'memo', title: 'Alpha', timeline: [entry({ memo: 'Void 셰이더를 처음 써 봤다' })] })
  const inTitle = project({ id: 'title', title: 'VOID Runner' })
  const unrelated = project({ id: 'other', title: 'Beta' })

  it('검색어가 비어 있으면 아무것도 돌려주지 않는다', () => {
    expect(searchArchive('   ', [category], [inTitle], 10)).toEqual([])
  })

  it('대소문자를 가리지 않고, 제목에서 찾은 것을 메모에서 찾은 것보다 앞에 둔다', () => {
    const ids = searchArchive('void', [category], [inMemo, unrelated, inTitle], 10).map((result) => result.id)
    expect(ids).toEqual(['title', 'memo'])
  })

  it('성단을 프로젝트보다 먼저 보여주고 성단의 색을 결과에 싣는다', () => {
    const results = searchArchive('ga', [category], [project({ id: 'p', title: 'Gallery' })], 10)
    expect(results.map((result) => result.type)).toEqual(['category', 'project'])
    expect(results[1].hue).toBe(category.hue)
  })

  it('개수 제한을 지킨다', () => {
    expect(searchArchive('void', [category], [inMemo, inTitle], 1)).toHaveLength(1)
  })
})
