import type { ID } from '@/types/archive'

export const ROUTE_PATTERNS = {
  galaxy: '/',
  system: '/system/:categoryId',
  project: '/project/:projectId',
} as const

export const routes = {
  galaxy: () => ROUTE_PATTERNS.galaxy,
  system: (categoryId: ID) => `/system/${encodeURIComponent(categoryId)}`,
  project: (projectId: ID) => `/project/${encodeURIComponent(projectId)}`,
}
