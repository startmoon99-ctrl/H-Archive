/** KeyboardEvent.code 기준 — 한글 입력 상태에서도 동일하게 동작한다 */
export const SHORTCUTS = {
  search: { code: 'KeyK', withModifier: true, hint: 'Ctrl K' },
  create: { code: 'KeyN', withModifier: false, hint: 'N' },
} as const;
