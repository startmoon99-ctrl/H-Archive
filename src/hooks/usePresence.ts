import { useEffect, useRef, useState } from 'react'
import type { DurationToken } from '@/config/motion'
import { motionMs } from '@/motion/runtime'

export type PresenceState = 'closed' | 'open'

/**
 * 닫히는 애니메이션이 끝날 때까지 요소를 남겨 둔다.
 * mounted가 true인 동안 렌더하고, data-state={state}로 CSS transition을 건다.
 */
export function usePresence(open: boolean, exitDuration: DurationToken = 'base') {
  const [mounted, setMounted] = useState(open)
  const [state, setState] = useState<PresenceState>('closed')

  useEffect(() => {
    if (open) {
      setMounted(true)
      // 닫힌 상태로 한 번 그려진 뒤에 열어야 transition이 시작된다
      let inner = 0
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setState('open'))
      })
      return () => {
        cancelAnimationFrame(outer)
        cancelAnimationFrame(inner)
      }
    }
    setState('closed')
    const timer = window.setTimeout(() => setMounted(false), motionMs(exitDuration))
    return () => window.clearTimeout(timer)
  }, [open, exitDuration])

  return { mounted, state }
}

/** 닫히는 동안에도 마지막 내용을 보여줄 수 있게 null이 아닌 마지막 값을 기억한다. */
export function useLastDefined<T>(value: T | null | undefined): T | null {
  const last = useRef<T | null>(null)
  if (value !== null && value !== undefined) last.current = value
  return last.current
}
