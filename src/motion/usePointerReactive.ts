import { useEffect, type RefObject } from 'react'
import { motionTokens } from '@/config/motion'
import { clamp } from '@/utils/math'
import { getMotion } from './runtime'

type Compute = (nx: number, ny: number, rect: DOMRect) => Record<string, string>

/** 요소 위의 마우스 위치(-1~1)를 CSS 변수로 옮긴다. 부드러운 복귀는 CSS transition이 맡는다. */
function usePointerVars(
  ref: RefObject<HTMLElement | null>,
  compute: Compute,
  resetVars: string[],
  enabled: boolean,
): void {
  useEffect(() => {
    const element = ref.current
    if (!element || !enabled) return

    const onMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      const rect = element.getBoundingClientRect()
      const nx = clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1)
      const ny = clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1)
      for (const [name, value] of Object.entries(compute(nx, ny, rect))) {
        element.style.setProperty(name, value)
      }
    }
    const onLeave = () => {
      for (const name of resetVars) element.style.removeProperty(name)
    }

    element.addEventListener('pointermove', onMove)
    element.addEventListener('pointerleave', onLeave)
    return () => {
      element.removeEventListener('pointermove', onMove)
      element.removeEventListener('pointerleave', onLeave)
    }
  }, [ref, compute, resetVars, enabled])
}

const MAGNETIC_VARS = ['--magnet-x', '--magnet-y']
const magnetic: Compute = (nx, ny, rect) => {
  const { strength, maxShift } = motionTokens.magnetic
  const amount = strength * getMotion().mouseFollow
  return {
    '--magnet-x': `${clamp((nx * rect.width * amount) / 2, -maxShift, maxShift)}px`,
    '--magnet-y': `${clamp((ny * rect.height * amount) / 2, -maxShift, maxShift)}px`,
  }
}

/** 버튼이 커서 쪽으로 살짝 끌려온다. 요소는 --magnet-x / --magnet-y를 transform에 쓴다. */
export function useMagnetic(ref: RefObject<HTMLElement | null>, enabled = true): void {
  usePointerVars(ref, magnetic, MAGNETIC_VARS, enabled)
}

const TILT_VARS = ['--tilt-x', '--tilt-y']
const tilt: Compute = (nx, ny) => {
  const deg = motionTokens.tilt.maxDeg * getMotion().tilt
  return { '--tilt-x': `${-ny * deg}deg`, '--tilt-y': `${nx * deg}deg` }
}

/** 카드가 커서를 따라 기운다. 요소는 --tilt-x / --tilt-y를 rotateX / rotateY에 쓴다. */
export function useTilt(ref: RefObject<HTMLElement | null>, enabled = true): void {
  usePointerVars(ref, tilt, TILT_VARS, enabled)
}
