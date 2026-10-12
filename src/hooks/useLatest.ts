import { useLayoutEffect, useRef } from 'react';

/** 항상 최신 값을 가리키는 ref — 이벤트 리스너를 다시 등록하지 않고 최신 콜백을 쓰기 위함 */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}
