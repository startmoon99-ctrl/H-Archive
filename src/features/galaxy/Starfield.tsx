import { useEffect, useRef } from 'react'
import { galaxyConfig } from '@/config/galaxy'
import { useViewport } from '@/hooks/useViewport'
import { onTick } from '@/motion/ticker'
import { selectActiveMotion, useMotionStore } from '@/store/motionStore'
import { createStarScene, drawStarScene } from './starScene'

interface StarfieldProps {
  /** true면 그리기를 멈춘다. 마지막 장면은 그대로 남는다. */
  paused: boolean
}

/**
 * 은하의 배경 캔버스. 화면 크기나 입자 밀도가 바뀔 때만 장면을 다시 만든다.
 * 기기 해상도 그대로(4K까지) 그리고, 그보다 큰 화면에서만 픽셀 수를 상한에 맞춰 줄인다.
 */
export function Starfield({ paused }: StarfieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { width, height, scale } = useViewport()
  const density = useMotionStore((state) => selectActiveMotion(state).particles)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context || paused) return

    const budget = Math.sqrt(galaxyConfig.starfield.maxPixels / (width * height))
    const ratio = Math.min(window.devicePixelRatio || 1, budget)
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
    context.setTransform(ratio, 0, 0, ratio, 0, 0)

    const scene = createStarScene(width, height, density, scale)
    return onTick((dt, now) => drawStarScene(context, scene, dt, now))
  }, [width, height, scale, density, paused])

  return <canvas ref={canvasRef} className="galaxy__canvas" aria-hidden="true" />
}
