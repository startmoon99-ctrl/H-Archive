import { galaxyConfig } from '@/config/galaxy'
import { pointer } from '@/motion/pointer'
import { getMotion } from '@/motion/runtime'
import { clamp, mod } from '@/utils/math'
import { between, seededRandom } from '@/utils/random'
import { cameraState } from './cameraState'

/**
 * 캔버스에 그리는 배경: 성운 → 깊이별 별 → 떠다니는 먼지.
 * 별의 수와 반응 크기는 모션 설정(Particle Density · Parallax · Background Motion · Glow)을 따른다.
 */

const config = galaxyConfig.starfield
const TAU = Math.PI * 2
const SCENE_SEED = 'h-archive-starfield'

interface Star {
  /** 0 ~ 1. 그릴 때 화면(여유 포함) 크기를 곱한다 */
  x: number
  y: number
  size: number
  alpha: number
  phase: number
  speed: number
  color: string
}

interface Layer {
  depth: number
  stars: Star[]
  /** 지난 프레임의 이동 · 배율. 빛줄기 방향을 구하는 데 쓴다 */
  lastX: number
  lastY: number
  lastScale: number
}

interface Dust {
  x: number
  y: number
  vx: number
  vy: number
  /** 밀려난 뒤 서서히 0으로 돌아가는 추가 속도 */
  pushX: number
  pushY: number
  size: number
  alpha: number
}

export interface StarScene {
  width: number
  height: number
  layers: Layer[]
  dust: Dust[]
  nebula: HTMLCanvasElement
}

function readColors(prefix: string, count: number): string[] {
  const style = getComputedStyle(document.documentElement)
  return Array.from({ length: count }, (_, index) => style.getPropertyValue(`--${prefix}-${index + 1}`).trim())
}

/** 성운은 한 번만 그려 두고 매 프레임 그대로 옮겨 그린다 */
function paintNebula(random: () => number, size: number): HTMLCanvasElement {
  const { blobs } = config.nebula
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) return canvas
  const colors = readColors('nebula', 4)
  context.globalCompositeOperation = 'lighter'
  for (let index = 0; index < blobs; index++) {
    const x = random() * size
    const y = random() * size
    const radius = size * (0.18 + random() * 0.3)
    const gradient = context.createRadialGradient(x, y, 0, x, y, radius)
    gradient.addColorStop(0, colors[index % colors.length])
    gradient.addColorStop(1, 'transparent')
    context.globalAlpha = 0.16 + random() * 0.2
    context.fillStyle = gradient
    context.fillRect(0, 0, size, size)
  }
  return canvas
}

/**
 * @param density 입자 밀도(모션 설정)
 * @param scale 화면 배율. 넓은 화면에서 별이 작아 보이지 않게 크기에 곱한다.
 */
export function createStarScene(width: number, height: number, density: number, scale: number): StarScene {
  const random = seededRandom(SCENE_SEED)
  const colors = readColors('star', 4)
  // 넓은 화면일수록 별이 더 필요하다. 커진 별만큼은 수를 덜 늘린다.
  const [minArea, maxArea] = config.areaScale
  const areaScale = clamp((width * height) / config.referenceArea / scale ** 2, minArea, maxArea)
  const [minNebula, maxNebula] = config.nebula.size
  const nebulaSize = Math.round(clamp(Math.max(width, height) / 2, minNebula, maxNebula))

  const layers: Layer[] = config.layers.map((layer) => ({
    depth: layer.depth,
    lastX: 0,
    lastY: 0,
    lastScale: 0,
    stars: Array.from({ length: Math.round(layer.count * density * areaScale) }, () => ({
      x: random(),
      y: random(),
      size: between(random, layer.size) * scale,
      alpha: between(random, layer.alpha),
      phase: random() * TAU,
      speed: 0.0004 + random() * 0.0012,
      color: colors[Math.floor(random() * colors.length)],
    })),
  }))

  const dust: Dust[] = Array.from({ length: Math.round(config.dust.count * density * areaScale) }, () => {
    const direction = random() * TAU
    return {
      x: random() * width,
      y: random() * height,
      vx: Math.cos(direction) * config.dust.speed,
      vy: Math.sin(direction) * config.dust.speed,
      pushX: 0,
      pushY: 0,
      size: between(random, config.dust.size) * scale,
      alpha: 0.12 + random() * 0.3,
    }
  })

  return { width, height, layers, dust, nebula: paintNebula(random, nebulaSize) }
}

function drawNebula(context: CanvasRenderingContext2D, scene: StarScene, now: number, glow: number, parallax: number): void {
  const { width, height, nebula } = scene
  const { margin, depth, alpha } = config.nebula
  const marginX = width * margin
  const marginY = height * margin
  // 카메라가 멀리 가도 여유 범위 안에서만 부드럽게 움직인다
  const rawX = -cameraState.x * cameraState.zoom * depth - pointer.nx * marginX * 0.3 * parallax
  const rawY = -cameraState.y * cameraState.zoom * depth - pointer.ny * marginY * 0.3 * parallax
  const offsetX = marginX * Math.tanh(rawX / marginX)
  const offsetY = marginY * Math.tanh(rawY / marginY)
  const breathe = 1 + 0.015 * Math.sin(now * 0.00007)

  context.globalAlpha = alpha * (0.55 + 0.45 * Math.min(glow, 1.3))
  context.drawImage(
    nebula,
    (-marginX + offsetX) * breathe,
    (-marginY + offsetY) * breathe,
    (width + marginX * 2) * breathe,
    (height + marginY * 2) * breathe,
  )
}

function drawStars(context: CanvasRenderingContext2D, scene: StarScene, now: number): void {
  const { width, height } = scene
  const { parallax, background } = getMotion()
  const padX = width * config.padding
  const padY = height * config.padding
  const fieldW = width + padX * 2
  const fieldH = height + padY * 2
  const centerX = width / 2
  const centerY = height / 2
  const twinkle = config.twinkle * Math.min(background, 1)

  context.lineCap = 'round'
  for (const layer of scene.layers) {
    const shiftX =
      -cameraState.x * cameraState.zoom * layer.depth * config.panDepth -
      pointer.nx * config.pointerShift * layer.depth * parallax
    const shiftY =
      -cameraState.y * cameraState.zoom * layer.depth * config.panDepth -
      pointer.ny * config.pointerShift * layer.depth * parallax
    const scale = clamp(1 + layer.depth * config.zoomDepth * Math.log(cameraState.zoom), 0.85, 1.7)
    // 첫 프레임에는 비교할 이전 값이 없으므로 움직임을 0으로 본다
    const first = layer.lastScale === 0
    const moveX = first ? 0 : shiftX - layer.lastX
    const moveY = first ? 0 : shiftY - layer.lastY
    const grow = first ? 0 : scale / layer.lastScale - 1
    layer.lastX = shiftX
    layer.lastY = shiftY
    layer.lastScale = scale

    for (const star of layer.stars) {
      const baseX = mod(star.x * fieldW + shiftX, fieldW) - padX
      const baseY = mod(star.y * fieldH + shiftY, fieldH) - padY
      const x = centerX + (baseX - centerX) * scale
      const y = centerY + (baseY - centerY) * scale
      if (x < -4 || x > width + 4 || y < -4 || y > height + 4) continue

      context.globalAlpha = star.alpha * (1 - twinkle * (0.5 + 0.5 * Math.sin(now * star.speed + star.phase)))
      // 카메라가 빠르게 움직이면 별이 이동 방향으로 늘어난다
      const trailX = (moveX + (x - centerX) * grow) * config.streakGain
      const trailY = (moveY + (y - centerY) * grow) * config.streakGain
      if (Math.abs(trailX) + Math.abs(trailY) > config.streakThreshold) {
        context.strokeStyle = star.color
        context.lineWidth = star.size
        context.beginPath()
        context.moveTo(x, y)
        context.lineTo(x - trailX, y - trailY)
        context.stroke()
      } else {
        context.fillStyle = star.color
        context.beginPath()
        context.arc(x, y, star.size * 0.5, 0, TAU)
        context.fill()
      }
    }
  }
}

function drawDust(context: CanvasRenderingContext2D, scene: StarScene, dt: number): void {
  const { width, height } = scene
  const { background, mouseFollow, glow } = getMotion()
  const { repelRadius, repelForce } = config.dust
  context.fillStyle = readDustColor()

  for (const mote of scene.dust) {
    if (pointer.active && mouseFollow > 0) {
      const dx = mote.x - pointer.x
      const dy = mote.y - pointer.y
      const distance = Math.hypot(dx, dy)
      if (distance < repelRadius && distance > 0.01) {
        const force = (1 - distance / repelRadius) * repelForce * mouseFollow * 0.01
        mote.pushX += (dx / distance) * force * dt
        mote.pushY += (dy / distance) * force * dt
      }
    }
    mote.x = mod(mote.x + (mote.vx * background + mote.pushX) * dt, width)
    mote.y = mod(mote.y + (mote.vy * background + mote.pushY) * dt, height)
    const decay = 0.96 ** (dt / 16)
    mote.pushX *= decay
    mote.pushY *= decay

    context.globalAlpha = mote.alpha * Math.min(glow, 1.3)
    context.beginPath()
    context.arc(mote.x, mote.y, mote.size, 0, TAU)
    context.fill()
  }
}

let dustColor = ''
function readDustColor(): string {
  dustColor ||= readColors('star', 3)[2]
  return dustColor
}

export function drawStarScene(context: CanvasRenderingContext2D, scene: StarScene, dt: number, now: number): void {
  const { glow, parallax } = getMotion()
  context.clearRect(0, 0, scene.width, scene.height)
  drawNebula(context, scene, now, glow, parallax)
  drawStars(context, scene, now)
  drawDust(context, scene, dt)
  context.globalAlpha = 1
}
