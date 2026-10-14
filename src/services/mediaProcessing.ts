import { MEDIA_PROCESSING, type StillTier } from '@/config/media'
import { clamp } from '@/utils/math'

/**
 * 브라우저 안에서 썸네일과 가벼운 Preview를 만든다.
 * 공간 화면과 카드는 여기서 만든 파일만 불러오고 원본은 건드리지 않는다.
 */

export interface VisualInfo {
  thumbnail?: Blob
  /** 큰 화면용 고해상도 이미지. 원본이 충분히 클 때만 만든다. */
  display?: Blob
  width?: number
  height?: number
  duration?: number
}

/** 원본을 tier의 크기 안으로 줄여 한 장을 만든다 */
function renderStill(source: CanvasImageSource, width: number, height: number, tier: StillTier): Promise<Blob | undefined> {
  const scale = Math.min(1, tier.maxEdge / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  const context = canvas.getContext('2d')
  if (!context) return Promise.resolve(undefined)
  context.imageSmoothingQuality = 'high'
  context.drawImage(source, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob ?? undefined), tier.type, tier.quality))
}

/** 썸네일과, 원본이 그보다 충분히 크면 큰 화면용 이미지까지 만든다 */
async function renderStills(
  source: CanvasImageSource,
  width: number,
  height: number,
): Promise<Pick<VisualInfo, 'thumbnail' | 'display'>> {
  const { thumbnail, display, displayMinGain } = MEDIA_PROCESSING
  const needsDisplay = Math.max(width, height) >= thumbnail.maxEdge * displayMinGain
  return {
    thumbnail: await renderStill(source, width, height, thumbnail),
    display: needsDisplay ? await renderStill(source, width, height, display) : undefined,
  }
}

function once(target: EventTarget, type: string, failType = 'error'): Promise<void> {
  return new Promise((resolve, reject) => {
    target.addEventListener(type, () => resolve(), { once: true })
    target.addEventListener(failType, () => reject(new Error(`${type} 실패`)), { once: true })
  })
}

/** 이미지 · GIF(첫 장면)의 썸네일과 큰 화면용 이미지 */
export async function describeImage(file: Blob): Promise<VisualInfo> {
  const bitmap = await createImageBitmap(file)
  try {
    const stills = await renderStills(bitmap, bitmap.width, bitmap.height)
    return { ...stills, width: bitmap.width, height: bitmap.height }
  } finally {
    bitmap.close()
  }
}

async function loadVideo(file: Blob): Promise<{ video: HTMLVideoElement; release: () => void }> {
  const video = document.createElement('video')
  const url = URL.createObjectURL(file)
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  video.src = url
  const release = () => {
    video.pause()
    video.removeAttribute('src')
    video.load()
    URL.revokeObjectURL(url)
  }
  try {
    await once(video, 'loadedmetadata')
  } catch (error) {
    release()
    throw error
  }
  return { video, release }
}

async function seekTo(video: HTMLVideoElement, seconds: number): Promise<void> {
  const seeked = once(video, 'seeked')
  video.currentTime = seconds
  await seeked
}

function posterTime(duration: number): number {
  const { seekRatio, maxSeekSeconds } = MEDIA_PROCESSING.poster
  return Number.isFinite(duration) ? Math.min(duration * seekRatio, maxSeekSeconds) : 0
}

/** 영상의 대표 장면과 크기 · 길이. 파일 전체를 읽지 않고 필요한 구간만 디코딩한다. */
export async function describeVideo(file: Blob): Promise<VisualInfo> {
  const { video, release } = await loadVideo(file)
  try {
    await seekTo(video, posterTime(video.duration))
    const stills = await renderStills(video, video.videoWidth, video.videoHeight)
    return {
      ...stills,
      width: video.videoWidth,
      height: video.videoHeight,
      duration: Number.isFinite(video.duration) ? video.duration : undefined,
    }
  } finally {
    release()
  }
}

/**
 * 짧고 가벼운 무음 Preview 영상을 만든다.
 * 원본을 축소해 캔버스에 그리면서 MediaRecorder로 녹화하므로 설정한 길이만큼 시간이 걸린다.
 * 브라우저가 지원하지 않거나 코덱을 읽지 못하면 null을 돌려준다(썸네일만 쓰게 된다).
 */
export async function createVideoPreview(file: Blob): Promise<Blob | null> {
  const config = MEDIA_PROCESSING.preview
  const mimeType = config.mimeCandidates.find((candidate) => window.MediaRecorder?.isTypeSupported(candidate))
  if (!mimeType) return null

  const { video, release } = await loadVideo(file)
  try {
    const scale = Math.min(1, config.maxHeight / video.videoHeight)
    const canvas = document.createElement('canvas')
    // 인코더는 짝수 크기를 요구한다
    canvas.width = Math.max(2, Math.round((video.videoWidth * scale) / 2) * 2)
    canvas.height = Math.max(2, Math.round((video.videoHeight * scale) / 2) * 2)
    const context = canvas.getContext('2d')
    if (!context || !canvas.captureStream) return null

    const start = posterTime(video.duration)
    const length = Number.isFinite(video.duration)
      ? clamp(video.duration - start, 0, config.seconds)
      : config.seconds
    if (length <= 0) return null
    await seekTo(video, start)

    const recorder = new MediaRecorder(canvas.captureStream(config.fps), {
      mimeType,
      videoBitsPerSecond: config.bitsPerSecond,
    })
    const chunks: Blob[] = []
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data)
    }
    const stopped = once(recorder, 'stop')

    let recording = true
    const draw = () => {
      if (!recording) return
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      if ('requestVideoFrameCallback' in video) video.requestVideoFrameCallback(draw)
      else requestAnimationFrame(draw)
    }

    recorder.start()
    await video.play()
    draw()
    await new Promise<void>((resolve) => {
      const timeout = window.setTimeout(resolve, config.timeoutMs)
      const check = () => {
        if (video.ended || video.currentTime - start >= length) {
          window.clearTimeout(timeout)
          video.removeEventListener('timeupdate', check)
          resolve()
        }
      }
      video.addEventListener('timeupdate', check)
      video.addEventListener('ended', check, { once: true })
    })

    recording = false
    recorder.stop()
    await stopped
    if (chunks.length === 0) return null
    return new Blob(chunks, { type: mimeType.split(';')[0] })
  } finally {
    release()
  }
}
