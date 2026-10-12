import { useRef, type RefObject } from 'react'

/** 이벤트 핸들러와 rAF 루프가 항상 최신 값을 읽게 한다(구독을 다시 걸지 않고). */
export function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value)
  ref.current = value
  return ref
}
