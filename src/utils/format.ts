import type { ISODate } from '@/types/archive'

/** 오늘 날짜(로컬 시간) */
export function todayISO(): ISODate {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

/** 2026-09-29 → 2026.09.29 */
export function formatDate(date: ISODate): string {
  return date.slice(0, 10).replaceAll('-', '.')
}

export function yearOf(date: ISODate): string {
  return date.slice(0, 4)
}

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB']

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B'
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), BYTE_UNITS.length - 1)
  const value = bytes / 1024 ** exponent
  return `${value >= 100 || exponent === 0 ? Math.round(value) : value.toFixed(1)} ${BYTE_UNITS[exponent]}`
}

/** 83 → 1:23 */
export function formatDuration(seconds: number): string {
  const total = Math.round(seconds)
  const minutes = Math.floor(total / 60)
  return `${minutes}:${String(total % 60).padStart(2, '0')}`
}

/** 파일 이름에서 확장자를 뗀다 */
export function baseName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '')
}
