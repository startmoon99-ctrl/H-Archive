import { useEffect, useRef } from 'react'
import { motionTokens } from '@/config/motion'
import { useViewport } from '@/hooks/useViewport'
import { lerp, smoothing } from '@/utils/math'
import { pointer } from './pointer'
import { getMotion } from './runtime'
import { onTick } from './ticker'
import './cursor-glow.css'

/** 커서를 천천히 따라오는 빛. 마우스 환경에서만 쓴다. */
export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null)
  const { touchUi } = useViewport()

  useEffect(() => {
    const element = ref.current
    if (!element || touchUi) return
    const position = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    return onTick((dt) => {
      const { mouseFollow, glow } = getMotion()
      const t = smoothing(motionTokens.cursorGlow.smoothing, dt)
      position.x = lerp(position.x, pointer.x, t)
      position.y = lerp(position.y, pointer.y, t)
      element.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`
      element.style.opacity = String(pointer.active ? Math.min(mouseFollow * glow, 1) : 0)
    })
  }, [touchUi])

  if (touchUi) return null
  return <div ref={ref} className="cursor-glow" aria-hidden="true" />
}
