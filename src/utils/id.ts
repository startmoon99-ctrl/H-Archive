/**
 * crypto.randomUUID 는 보안 컨텍스트에서만 동작한다.
 * 모바일 테스트(http://192.168.x.x)에서도 생성할 수 있도록 대체 경로를 둔다.
 */
export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
