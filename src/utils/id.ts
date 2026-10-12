import type { ID } from '@/types/archive'

/** crypto.randomUUID는 http LAN 주소(모바일 테스트)에서 쓸 수 없어 getRandomValues로 만든다. */
export function createId(): ID {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
}
