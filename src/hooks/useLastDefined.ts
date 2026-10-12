import { useRef } from 'react';

/** 값이 비워져도 마지막 유효 값을 유지한다 — 닫히는 애니메이션 동안 내용을 보여 주기 위함 */
export function useLastDefined<T>(value: T | null | undefined): T | null {
  const ref = useRef<T | null>(null);
  if (value != null) ref.current = value;
  return value ?? ref.current;
}
