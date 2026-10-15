import { cameraView } from '../camera/cameraView'
import type { FarImageUniforms, GlRenderer } from './glRenderer'

/**
 * 아주 먼 곳의 그림 하나(은하 · 성운): 배경 파노라마처럼 하늘에 붙어, 카메라가 어디에 있든 정한 방향의 아주 먼 곳에
 * 화면을 향해 놓인다. 이동 · 확대에는 움직이지 않고 방향만 따르므로 평면 사진이 가까이 떠 있는 것처럼 보이지 않는다.
 * 움직이는 WebP면 프레임을 풀어 텍스처 배열로 올리고(끝과 처음은 crossfadeFrames만큼 겹쳐 서서히 이어 붙이고,
 * 프레임 사이를 섞어 slow배로 느리게 재생한다), 멈춘 그림이면 한 장으로 올린다.
 * spinDegPerSec가 있으면 첫 프레임에서 찾은 원반 면을 따라 계속 돌린다.
 * 그리는 모양(바탕 누르기 · 색 빼기 · 가장자리 지우기 · 아래쪽 풀기)은 shaders.ts의 FAR_FRAGMENT가 정한다.
 */

/** 먼 곳의 그림 하나의 값. config/space.ts의 particles.farImages */
export interface FarImageConfig {
  /** 렌더러가 이 그림의 텍스처를 구별하는 이름 */
  id: string
  enabled: boolean
  src: string
  yawDeg: number
  pitchDeg: number
  distance: number
  size: number
  slow: number
  spinDegPerSec: number
  crossfadeFrames: number
  textureSize: number
  textureSizeLow: number
  blackLevel: number
  saturation: number
  brightness: number
  coolKey: number
  contrast: number
  mask: readonly [number, number]
  bottomFade: readonly [number, number]
  fadeInMs: number
  /**
   * 그림 안에서 보여 줄 중심(0 ~ 1). 놓이는 자리의 한가운데에 오고, 가장자리를 지우는 원의 중심이 된다.
   * 없으면 그림 가운데. 도는 그림(spinDegPerSec)은 원반을 스스로 찾으므로 쓰지 않는다
   */
  focus?: readonly [number, number]
}

export interface FarImage {
  /**
   * 매 프레임 부른다. 아직 다 받지 못했거나 꺼져 있으면 null
   * @param rate 0 ~ 1. Background Motion. 0이면 한 장면에 멈춘다
   */
  update(dt: number, now: number, rate: number): FarImageUniforms | null
  dispose(): void
}

function smoothstep(t: number): number {
  const x = Math.min(Math.max(t, 0), 1)
  return x * x * (3 - 2 * x)
}

/** 그림 안 원반: 중심(0 ~ 1) · 긴 축의 방향(라디안) · 짧은 축 / 긴 축 */
type Disk = [number, number, number, number]

/** 원반을 찾지 않거나 찾지 못했을 때: 그림 가운데의 둥근 원반 */
const ROUND_DISK: Disk = [0.5, 0.5, 0, 1]
/** 밝기 모멘트를 잴 때 쓰는 작은 크기(px)와 바탕으로 볼 밝기 */
const DISK_SAMPLE_PX = 160
const DISK_FLOOR = 0.07

/**
 * 밝기의 모멘트로 은하 원반을 찾는다: 밝기 중심이 원반의 중심, 퍼진 방향이 긴 축,
 * 두 방향으로 퍼진 정도의 비가 기울어 납작해 보이는 정도다.
 */
function measureDisk(image: ImageBitmap): Disk {
  const width = DISK_SAMPLE_PX
  const height = Math.max(1, Math.round((DISK_SAMPLE_PX * image.height) / image.width))
  const context = new OffscreenCanvas(width, height).getContext('2d')
  if (!context) return ROUND_DISK
  context.drawImage(image, 0, 0, width, height)
  const pixels = context.getImageData(0, 0, width, height).data
  const light = new Float32Array(width * height)
  let mass = 0
  let sumX = 0
  let sumY = 0
  for (let index = 0; index < light.length; index++) {
    const value = Math.max(0, (pixels[index * 4] + pixels[index * 4 + 1] + pixels[index * 4 + 2]) / 765 - DISK_FLOOR)
    light[index] = value
    mass += value
    sumX += value * (index % width)
    sumY += value * Math.floor(index / width)
  }
  if (mass <= 0) return ROUND_DISK
  const cx = sumX / mass
  const cy = sumY / mass
  let xx = 0
  let yy = 0
  let xy = 0
  for (let index = 0; index < light.length; index++) {
    const dx = (index % width) - cx
    const dy = Math.floor(index / width) - cy
    xx += light[index] * dx * dx
    yy += light[index] * dy * dy
    xy += light[index] * dx * dy
  }
  xx /= mass
  yy /= mass
  xy /= mass
  const half = (xx + yy) / 2
  const spread = Math.sqrt(Math.max(half * half - (xx * yy - xy * xy), 0))
  const ratio = Math.sqrt(Math.max(half - spread, 0) / Math.max(half + spread, 1e-6))
  return [cx / width, cy / height, 0.5 * Math.atan2(2 * xy, xx - yy), Math.min(Math.max(ratio, 0.1), 1)]
}

/** 긴 변을 longSide로 줄인 크기 */
function fit(width: number, height: number, longSide: number) {
  const ratio = Math.min(1, longSide / Math.max(width, height))
  return { resizeWidth: Math.round(width * ratio), resizeHeight: Math.round(height * ratio), resizeQuality: 'high' as const }
}

/**
 * 그림을 풀어 줄인 프레임들과 한 프레임의 시간(ms).
 * ImageDecoder가 있으면 움직이는 그림의 모든 프레임을, 없으면(일부 브라우저) 첫 장면 한 장만 쓴다
 */
async function decodeFrames(src: string, longSide: number): Promise<{ frames: ImageBitmap[]; frameMs: number }> {
  const response = await fetch(src)
  if (!response.ok) throw new Error(`${response.status} ${response.url}`)
  const blob = await response.blob()
  if (typeof ImageDecoder === 'undefined') {
    const first = await createImageBitmap(blob)
    const { width, height } = first
    first.close()
    return { frames: [await createImageBitmap(blob, fit(width, height, longSide))], frameMs: 60 }
  }
  const decoder = new ImageDecoder({ data: blob.stream(), type: blob.type || 'image/webp' })
  try {
    await decoder.tracks.ready
    const count = decoder.tracks.selectedTrack?.frameCount ?? 0
    const frames: ImageBitmap[] = []
    let totalMs = 0
    for (let index = 0; index < count; index++) {
      const { image } = await decoder.decode({ frameIndex: index })
      frames.push(await createImageBitmap(image, fit(image.displayWidth, image.displayHeight, longSide)))
      totalMs += (image.duration ?? 0) / 1000
      image.close()
    }
    return { frames, frameMs: count > 0 && totalMs > 0 ? totalMs / count : 60 }
  } finally {
    decoder.close()
  }
}

export function createFarImage(renderer: GlRenderer, touchDevice: boolean, config: FarImageConfig): FarImage {
  const id = config.id
  let count = 0
  let frameMs = 60
  let aspect = 1
  let disk: Disk = ROUND_DISK
  /** 원반 면에서 돈 각도(라디안) */
  let spin = 0
  let loadedAt = -1
  /** 지금 보여 주는 자리(프레임 단위, 이어 붙인 고리 안) */
  let phase = 0
  let disposed = false

  const load = async () => {
    if (!config.enabled) return
    try {
      const decoded = await decodeFrames(config.src, touchDevice ? config.textureSizeLow : config.textureSize)
      if (decoded.frames.length === 0) return
      if (disposed) {
        decoded.frames.forEach((frame) => frame.close())
        return
      }
      renderer.setFarFrames(id, decoded.frames)
      count = decoded.frames.length
      frameMs = decoded.frameMs
      aspect = decoded.frames[0].height / decoded.frames[0].width
      disk =
        config.spinDegPerSec !== 0
          ? measureDisk(decoded.frames[0])
          : [config.focus?.[0] ?? 0.5, config.focus?.[1] ?? 0.5, 0, 1]
      decoded.frames.forEach((frame) => frame.close())
      loadedAt = performance.now()
    } catch (error) {
      if (import.meta.env.DEV) console.warn(`[${id}] 그림을 불러오지 못했습니다.`, error)
    }
  }
  void load()

  return {
    update(dt, now, rate) {
      if (loadedAt < 0 || count === 0) return null
      // 끝의 overlap 프레임을 처음과 겹쳐, 고리의 길이는 count - overlap이다(한 장이면 그대로)
      const overlap = Math.min(config.crossfadeFrames, Math.floor(count / 3))
      const loop = Math.max(count - overlap, 1)
      phase = (phase + (dt / (frameMs * config.slow)) * rate) % loop
      spin = (spin + ((config.spinDegPerSec * Math.PI) / 180) * (dt / 1000) * rate) % (Math.PI * 2)
      // 연속된 자리 x를 그리는 두 장과 그 사이의 비율
      const pair = (x: number): [number, number, number] => {
        const first = Math.min(Math.floor(x), count - 1)
        return [first, Math.min(first + 1, count - 1), x - first]
      }
      const [a0, a1, af] = pair(phase)
      // 고리의 처음(overlap 구간)에서는 끝 부분의 프레임에서 서서히 넘어온다
      const joining = phase < overlap
      const [b0, b1, bf] = joining ? pair(phase + loop) : [a0, a1, af]
      const yaw = (config.yawDeg * Math.PI) / 180
      const pitch = (config.pitchDeg * Math.PI) / 180
      // 처음 구도는 -z를 바라본다(오른쪽 +x, 아래 +y). 왼쪽 · 위가 +인 각도로 방향을 정한다
      const direction = [-Math.sin(yaw) * Math.cos(pitch), -Math.sin(pitch), -Math.cos(yaw) * Math.cos(pitch)]
      // 하늘에 붙인다: 카메라가 어디에 있든 그 방향으로 같은 거리. 이동 · 확대에는 움직이지 않아 아주 멀리 있는 것처럼 보인다
      const eye = cameraView.position
      return {
        id,
        center: [
          eye[0] + direction[0] * config.distance,
          eye[1] + direction[1] * config.distance,
          eye[2] + direction[2] * config.distance,
        ],
        size: [config.size, config.size * aspect],
        layers: [a0, a1, b0, b1],
        weights: [af, bf, joining ? phase / overlap : 1],
        tone: [config.blackLevel, config.saturation, config.brightness, smoothstep((now - loadedAt) / config.fadeInMs)],
        mask: [config.mask[0], config.mask[1]],
        disk,
        spin: [spin, 1 / aspect],
        coolKey: config.coolKey,
        contrast: config.contrast,
        bottomFade: [config.bottomFade[0], config.bottomFade[1]],
      }
    },

    dispose() {
      disposed = true
    },
  }
}
