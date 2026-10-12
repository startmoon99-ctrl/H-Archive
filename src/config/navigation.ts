import { Clock, Hash, LayoutGrid, Waypoints, type LucideIcon } from 'lucide-react';

/** 라우터에 등록하는 경로 패턴 */
export const ROUTE_PATTERNS = {
  graph: '/',
  gallery: '/gallery',
  tags: '/tags/:tag?',
  recent: '/recent',
  item: '/item/:id',
} as const;

/** 실제 이동에 쓰는 경로 생성기 */
export const ROUTES = {
  graph: '/',
  gallery: '/gallery',
  tags: '/tags',
  tag: (tag: string) => `/tags/${encodeURIComponent(tag)}`,
  recent: '/recent',
  item: (id: string) => `/item/${encodeURIComponent(id)}`,
} as const;

export interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
}

/** Sidebar / BottomNav / TopBar 제목이 공유하는 메뉴 정의 */
export const NAV_ITEMS: NavItem[] = [
  { id: 'graph', label: '그래프', path: ROUTES.graph, icon: Waypoints },
  { id: 'gallery', label: '갤러리', path: ROUTES.gallery, icon: LayoutGrid },
  { id: 'tags', label: '태그', path: ROUTES.tags, icon: Hash },
  { id: 'recent', label: '최근', path: ROUTES.recent, icon: Clock },
];

export const isNavActive = (item: NavItem, pathname: string) =>
  item.path === ROUTES.graph ? pathname === ROUTES.graph : pathname.startsWith(item.path);

export const findNavItem = (pathname: string) => NAV_ITEMS.find((item) => isNavActive(item, pathname));
