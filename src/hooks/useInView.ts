import { useEffect, useRef, useState, type RefObject } from 'react'

interface InViewOptions {
  /** true면 한 번 보인 뒤 관찰을 멈춘다 */
  once?: boolean
  rootMargin?: string
}

/** 요소가 화면에 보이는지. 지연 로딩과 스크롤 등장 효과가 함께 쓴다. */
export function useInView<T extends Element>({ once = false, rootMargin = '0px' }: InViewOptions = {}): [
  RefObject<T | null>,
  boolean,
] {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting)
        if (entry.isIntersecting && once) observer.disconnect()
      },
      { rootMargin },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [once, rootMargin])

  return [ref, inView]
}
