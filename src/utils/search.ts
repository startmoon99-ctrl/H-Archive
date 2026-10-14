import type { Category, ID, Project } from '@/types/archive'

export interface SearchResult {
  type: 'category' | 'project'
  id: ID
  title: string
  /** 어디에서 찾았는지 보여주는 한 줄 */
  context: string
  hue: number
}

/** 일치한 위치별 가중치. 제목이 가장 앞에 온다. */
const WEIGHTS = { title: 100, tag: 60, description: 40, entryTitle: 30, memo: 20, tech: 20 }
const SNIPPET_RADIUS = 28

function normalize(text: string): string {
  return text.trim().toLowerCase()
}

function snippet(text: string, query: string): string {
  const index = normalize(text).indexOf(query)
  if (index < 0) return text
  const start = Math.max(0, index - SNIPPET_RADIUS)
  const end = Math.min(text.length, index + query.length + SNIPPET_RADIUS)
  return `${start > 0 ? '…' : ''}${text.slice(start, end).trim()}${end < text.length ? '…' : ''}`
}

function matchProject(project: Project, query: string): { score: number; context: string } | null {
  const has = (text: string) => normalize(text).includes(query)
  let score = 0
  let context = ''
  const hit = (weight: number, text: string) => {
    score += weight
    if (!context) context = text
  }

  if (has(project.title)) hit(WEIGHTS.title, project.description)
  const tag = project.tags.find(has)
  if (tag) hit(WEIGHTS.tag, `#${tag}`)
  if (has(project.description)) hit(WEIGHTS.description, snippet(project.description, query))
  for (const entry of project.timeline) {
    if (has(entry.title)) hit(WEIGHTS.entryTitle, `기록 · ${entry.title}`)
    if (has(entry.memo)) hit(WEIGHTS.memo, `“${snippet(entry.memo, query)}”`)
    const tech = entry.tech.find(has)
    if (tech) hit(WEIGHTS.tech, `기술 · ${tech}`)
  }
  return score > 0 ? { score, context } : null
}

/** 검색어가 비어 있으면 빈 배열. 최근 항목 표시는 호출하는 쪽에서 정한다. */
export function searchArchive(rawQuery: string, categories: Category[], projects: Project[], limit: number): SearchResult[] {
  const query = normalize(rawQuery)
  if (!query) return []
  const hueOf = new Map(categories.map((category) => [category.id, category.hue]))

  const categoryResults: SearchResult[] = categories
    .filter((category) => normalize(category.name).includes(query))
    .map((category) => ({
      type: 'category',
      id: category.id,
      title: category.name,
      context: category.description || '성단',
      hue: category.hue,
    }))

  const projectResults = projects
    .map((project) => ({ project, match: matchProject(project, query) }))
    .filter((item): item is { project: Project; match: { score: number; context: string } } => item.match !== null)
    .sort((a, b) => b.match.score - a.match.score)
    .map<SearchResult>(({ project, match }) => ({
      type: 'project',
      id: project.id,
      title: project.title,
      context: match.context,
      hue: hueOf.get(project.categoryId) ?? 0,
    }))

  return [...categoryResults, ...projectResults].slice(0, limit)
}
