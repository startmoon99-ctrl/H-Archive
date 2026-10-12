const MINUTE = 60_000;
const HOUR = 3_600_000;
const DAY = 86_400_000;

const dateFormatter = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });

export const formatDate = (iso: string) => dateFormatter.format(new Date(iso));

export function formatRelative(iso: string, now = Date.now()): string {
  const diff = now - Date.parse(iso);
  if (diff < MINUTE) return '방금 전';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}분 전`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}시간 전`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)}일 전`;
  return formatDate(iso);
}

export const RECENCY_GROUPS = [
  { id: 'today', label: '오늘' },
  { id: 'yesterday', label: '어제' },
  { id: 'week', label: '최근 7일' },
  { id: 'month', label: '최근 30일' },
  { id: 'older', label: '이전' },
] as const;

export type RecencyGroupId = (typeof RECENCY_GROUPS)[number]['id'];

export function getRecencyGroup(iso: string, now = Date.now()): RecencyGroupId {
  const startOfToday = new Date(now).setHours(0, 0, 0, 0);
  const time = Date.parse(iso);
  if (time >= startOfToday) return 'today';
  if (time >= startOfToday - DAY) return 'yesterday';
  if (time >= startOfToday - 6 * DAY) return 'week';
  if (time >= startOfToday - 29 * DAY) return 'month';
  return 'older';
}

export const byUpdatedDesc = (a: { updatedAt: string }, b: { updatedAt: string }) =>
  b.updatedAt.localeCompare(a.updatedAt);
