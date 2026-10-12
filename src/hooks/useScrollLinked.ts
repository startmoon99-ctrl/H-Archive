import { useEffect, type RefObject } from 'react'

/** 스크롤 위치에서 0 ~ 1(또는 px) 값을 계산한다 */
export type ScrollMeasure = (rect: DOMRect, viewportHeight: number, scrollTop: number) => number

/**
 * 스크롤에 연동되는 애니메이션. 가장 가까운 [data-scroll-root]의 스크롤을 따라
 * 요소의 --scroll 변수를 갱신한다(프레임당 한 번). 움직임 자체는 CSS가 이 변수로 만든다.
 */
export function useScrollLinked(ref: RefObject<HTMLElement | null>, measure: ScrollMeasure): void {
  useEffect(() => {
    const element = ref.current
    const root = element?.closest<HTMLElement>('[data-scroll-root]')
    if (!element || !root) return

    let frame = 0
    const update = () => {
      frame = 0
      const value = measure(element.getBoundingClientRect(), root.clientHeight, root.scrollTop)
      element.style.setProperty('--scroll', value.toFixed(3))
    }
    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(update)
    }

    update()
    root.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      root.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [ref, measure])
}
