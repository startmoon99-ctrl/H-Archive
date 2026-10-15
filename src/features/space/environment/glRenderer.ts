import type { MeteorFrame } from './meteors'
import { PARTICLE_STRIDE } from './particleField'
import {
  BACKDROP_FRAGMENT,
  BACKDROP_VERTEX,
  FAR_FRAGMENT,
  FAR_VERTEX,
  LINE_FRAGMENT,
  LINE_VERTEX,
  POINT_FRAGMENT,
  POINT_VERTEX,
  STREAK_FRAGMENT,
  STREAK_VERTEX,
} from './shaders'

const FLOAT_BYTES = 4
/** 선의 꼭짓점 하나: x y z · alpha */
export const LINE_STRIDE = 4
/** 별똥별 꼭짓점 하나: 화면 중심 기준 x y(px) · 밝기 · 사각형 안의 위치 u v(-1 ~ 1) */
export const STREAK_STRIDE = 5

export interface FrameUniforms {
  /** 카메라 위치와 오른쪽 · 아래 · 뒤 방향(world) */
  camera: [number, number, number]
  right: [number, number, number]
  down: [number, number, number]
  back: [number, number, number]
  focal: number
  near: number
  focusDistance: number
  /** 초 */
  time: number
  drift: number
  /** 화면 중심 기준 px와 밀어내는 세기 */
  pointer: [number, number, number]
  repelRadius: number
  repelPx: number
  /** 성단의 숨: 주기의 범위(초) · 반지름이 변하는 비율 · 밝기가 변하는 비율 */
  breath: [number, number, number, number]
  /** 커서를 알아차리는 범위(px) · 가까운 범위(px) · 세기(0 ~ 1) · 기우는 거리(px) */
  aware: [number, number, number, number]
  /** 알아차린 성단의 입자: 밝기 · 모임 · 흔들림 */
  awareEffect: [number, number, number]
  /** 입자가 감싸는 지점(화면 중심 기준 px)과 세기(0 ~ 1) */
  wrap: [number, number, number]
  wrapRadius: number
  wrapPx: number
  blurPx: number
  maxPoint: number
  glow: number
  /** 성단 입자가 반짝이는 정도 */
  twinkle: number
  /** 배경의 별: 별가루 · 반짝이는 별의 주기 범위(초) · 옅어지는 비율 · 크기 변화 · 빛무리 */
  starPeriod: [number, number, number, number]
  starFade: [number, number, number, number]
  starHalo: number
  /** 반짝이는 별이 가장 밝을 때 더 밝아지는 비율 */
  twinkleLift: number
  /** 떠다니는 거리(px)와 주기 범위(초) */
  starDrift: [number, number, number]
  /** 빛살: 차례 하나의 길이(초) · 별의 수 · 차례마다 빛날 확률 · 빛살 길이(별 크기의 배수) */
  sparkle: [number, number, number, number]
  flareSec: [number, number]
  /** 그리는 별가루 · 반짝이는 별의 비율(0 ~ 1) */
  starShare: number
  lineColor: [number, number, number]
  /** 별똥별 빛줄기의 색 */
  streakColor: [number, number, number]
  /**
   * 별똥별을 가리는 성단(MAX_COVERS개): 화면 중심 기준 x y(px) · 반지름(px) · 가리는 세기와 쓰는 수,
   * 다 가려지는 안쪽의 비율(반지름 대비)
   */
  covers: Float32Array
  coverCount: number
  coverInner: number
  /** 옮겨 가는 성단(MAX_MOVES개): 입자를 만들 때의 중심과 사용 여부(xyzw) · 옮긴 거리(xyz) · 속도(xyz) */
  moveFrom: Float32Array
  moveBy: Float32Array
  moveVelocity: Float32Array
  /** 입자가 늦게 따라오는 시간 범위(초)와 꼬리 길이 상한(world) */
  trail: [number, number, number]
}

/** 가장 뒤의 파노라마를 그리는 값 */
export interface BackdropUniforms {
  /** 정면에 올 파노라마의 가로 위치(라디안) */
  yawOffset: number
  /** 밝기 배율 · 채도 · 나타난 정도(0 ~ 1) */
  tone: [number, number, number]
}

/** 아주 먼 곳의 그림(은하 · 성운) 하나를 그리는 값. farImage.ts가 만든다 */
export interface FarImageUniforms {
  /** setFarFrames로 올린 텍스처의 이름 */
  id: string
  /** 놓이는 자리(world)와 가로 · 세로 크기(world) */
  center: [number, number, number]
  size: [number, number]
  /** 섞어 그릴 프레임 네 장(지금 시각의 두 장 · 이어 붙이는 구간의 두 장)과 그 비율 */
  layers: [number, number, number, number]
  weights: [number, number, number]
  /** 검은 바탕 밝기 · 채도 · 밝기 배율 · 나타난 정도 */
  tone: [number, number, number, number]
  /** 가장자리를 지우는 범위 */
  mask: [number, number]
  /** 그림 안 은하 원반: 중심(0 ~ 1) · 긴 축의 방향(라디안) · 짧은 축 / 긴 축 */
  disk: [number, number, number, number]
  /** 원반 면에서 돈 각도(라디안)와 그림의 가로 / 세로 */
  spin: [number, number]
  /** 푸른 바탕을 누르는 정도(0 ~ 1) */
  coolKey: number
  /** 어두운 쪽을 누르는 곡선의 세기(1이면 그대로, 클수록 옅은 바탕이 0으로 사라지고 밝은 곳만 남는다) */
  contrast: number
  /** 아래쪽을 어둠으로 풀어 주는 범위(그림 높이 비율, 앞 값부터 뒤 값까지). 앞 값이 뒤 값 이상이면 풀지 않는다 */
  bottomFade: [number, number]
}

export interface GlRenderer {
  /** 화면 크기(CSS px)와 실제로 그릴 해상도 배율 */
  resize(width: number, height: number, ratio: number): void
  setParticles(data: Float32Array): void
  /** 이 기기가 올릴 수 있는 텍스처의 최대 크기(px) */
  readonly maxTextureSize: number
  /** 가장 뒤의 파노라마(정거원통). null이면 그리지 않는다 */
  setBackdrop(image: TexImageSource | null): void
  /** 먼 곳의 그림 id의 프레임들(모두 같은 크기). 빈 배열이면 지운다 */
  setFarFrames(id: string, frames: ImageBitmap[]): void
  /**
   * @param particleFraction 0 ~ 1. 품질 단계에 따라 입자의 일부만 그린다
   * @param meteor 별똥별(meteors.ts)의 빛줄기 · 빛살. 꼭짓점이 없으면 그리지 않는다
   */
  draw(
    uniforms: FrameUniforms,
    particleFraction: number,
    lines: Float32Array,
    lineVertices: number,
    meteor: MeteorFrame,
    backdrop: BackdropUniforms,
    far: FarImageUniforms[],
  ): void
  dispose(): void
}

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type)
  if (!shader) throw new Error('셰이더를 만들 수 없습니다.')
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? '셰이더 컴파일 실패')
  }
  return shader
}

function link(gl: WebGL2RenderingContext, vertex: string, fragment: string): WebGLProgram {
  const program = gl.createProgram()
  if (!program) throw new Error('셰이더 프로그램을 만들 수 없습니다.')
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertex))
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragment))
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? '셰이더 연결 실패')
  }
  return program
}

/** 이름으로 uniform 위치를 찾아 기억해 둔다 */
function uniformLookup(gl: WebGL2RenderingContext, program: WebGLProgram) {
  const cache = new Map<string, WebGLUniformLocation | null>()
  return (name: string) => {
    if (!cache.has(name)) cache.set(name, gl.getUniformLocation(program, name))
    return cache.get(name) ?? null
  }
}

/**
 * 입자 · 선 · 별똥별 빛줄기만 그리는 작은 WebGL2 렌더러. 라이브러리 없이 필요한 것만 다룬다.
 * WebGL2를 쓸 수 없으면 null을 돌려주고, 그때는 입자 없이 나머지 화면만 보인다.
 */
export function createGlRenderer(canvas: HTMLCanvasElement): GlRenderer | null {
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: false, premultipliedAlpha: true })
  if (!gl) return null

  const backdropProgram = link(gl, BACKDROP_VERTEX, BACKDROP_FRAGMENT)
  const backdropUniform = uniformLookup(gl, backdropProgram)
  // 꼭짓점을 gl_VertexID로 만드므로 속성 없는 빈 묶음이면 된다
  const backdropArray = gl.createVertexArray()
  let backdropTexture: WebGLTexture | null = null
  const farProgram = link(gl, FAR_VERTEX, FAR_FRAGMENT)
  const farUniform = uniformLookup(gl, farProgram)
  /** 먼 곳의 그림마다 프레임을 담은 텍스처 배열 */
  const farTextures = new Map<string, WebGLTexture>()
  const pointProgram = link(gl, POINT_VERTEX, POINT_FRAGMENT)
  const lineProgram = link(gl, LINE_VERTEX, LINE_FRAGMENT)
  const streakProgram = link(gl, STREAK_VERTEX, STREAK_FRAGMENT)
  const pointUniform = uniformLookup(gl, pointProgram)
  const lineUniform = uniformLookup(gl, lineProgram)
  const streakUniform = uniformLookup(gl, streakProgram)

  const pointArray = gl.createVertexArray()
  const pointBuffer = gl.createBuffer()
  gl.bindVertexArray(pointArray)
  gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer)
  const pointBytes = PARTICLE_STRIDE * FLOAT_BYTES
  // 위치(3) · 크기(1) · 색(4) · seed(1) · blur(1) · 성단의 중심과 반지름(4) · 성단의 박자(1) · 별의 종류와 차례(2)
  ;[3, 1, 4, 1, 1, 4, 1, 2].reduce((offset, size, location) => {
    gl.enableVertexAttribArray(location)
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, pointBytes, offset * FLOAT_BYTES)
    return offset + size
  }, 0)

  const lineArray = gl.createVertexArray()
  const lineBuffer = gl.createBuffer()
  gl.bindVertexArray(lineArray)
  gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer)
  const lineBytes = LINE_STRIDE * FLOAT_BYTES
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, lineBytes, 0)
  gl.enableVertexAttribArray(1)
  gl.vertexAttribPointer(1, 1, gl.FLOAT, false, lineBytes, 3 * FLOAT_BYTES)

  const streakArray = gl.createVertexArray()
  const streakBuffer = gl.createBuffer()
  gl.bindVertexArray(streakArray)
  gl.bindBuffer(gl.ARRAY_BUFFER, streakBuffer)
  // 화면 위치(2) · 밝기(1) · 사각형 안의 위치(2)
  ;[2, 1, 2].reduce((offset, size, location) => {
    gl.enableVertexAttribArray(location)
    gl.vertexAttribPointer(location, size, gl.FLOAT, false, STREAK_STRIDE * FLOAT_BYTES, offset * FLOAT_BYTES)
    return offset + size
  }, 0)
  gl.bindVertexArray(null)

  // 빛을 더하는 방식으로 겹친다
  gl.enable(gl.BLEND)
  gl.blendFunc(gl.ONE, gl.ONE)
  gl.clearColor(0, 0, 0, 0)

  let particleCount = 0
  let size = { width: 1, height: 1, ratio: 1 }

  const setProjection = (uniform: ReturnType<typeof uniformLookup>, frame: FrameUniforms) => {
    gl.uniform3fv(uniform('uCamera'), frame.camera)
    gl.uniform3fv(uniform('uRight'), frame.right)
    gl.uniform3fv(uniform('uDown'), frame.down)
    gl.uniform3fv(uniform('uBack'), frame.back)
    gl.uniform1f(uniform('uFocal'), frame.focal)
    gl.uniform2f(uniform('uHalf'), size.width / 2, size.height / 2)
    gl.uniform1f(uniform('uNear'), frame.near)
  }

  return {
    resize(width, height, ratio) {
      size = { width, height, ratio }
      canvas.width = Math.max(1, Math.round(width * ratio))
      canvas.height = Math.max(1, Math.round(height * ratio))
      gl.viewport(0, 0, canvas.width, canvas.height)
    },

    setParticles(data) {
      particleCount = data.length / PARTICLE_STRIDE
      gl.bindBuffer(gl.ARRAY_BUFFER, pointBuffer)
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
    },

    maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE) as number,

    setBackdrop(image) {
      if (backdropTexture) gl.deleteTexture(backdropTexture)
      backdropTexture = null
      if (!image) return
      backdropTexture = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, backdropTexture)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
      // 가로는 한 바퀴 이어지고 세로는 끝에서 멈춘다. 화면 픽셀과 원본이 거의 1:1이라 밉맵 없이 그린다(이음매 · 메모리 절약)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.bindTexture(gl.TEXTURE_2D, null)
    },

    setFarFrames(id, frames) {
      const previous = farTextures.get(id)
      if (previous) gl.deleteTexture(previous)
      farTextures.delete(id)
      if (frames.length === 0) return
      const { width, height } = frames[0]
      const texture = gl.createTexture()
      farTextures.set(id, texture)
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture)
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false)
      gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA, width, height, frames.length, 0, gl.RGBA, gl.UNSIGNED_BYTE, null)
      frames.forEach((image, layer) => {
        gl.texSubImage3D(gl.TEXTURE_2D_ARRAY, 0, 0, 0, layer, width, height, 1, gl.RGBA, gl.UNSIGNED_BYTE, image)
      })
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.bindTexture(gl.TEXTURE_2D_ARRAY, null)
    },

    draw(frame, particleFraction, lines, lineVertices, meteor, backdrop, far) {
      gl.clear(gl.COLOR_BUFFER_BIT)

      // 가장 뒤의 파노라마: 입자 · 선보다 먼저 화면 전체를 칠한다
      if (backdropTexture && backdrop.tone[2] > 0) {
        gl.useProgram(backdropProgram)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D, backdropTexture)
        gl.uniform1i(backdropUniform('uImage'), 0)
        gl.uniform3fv(backdropUniform('uRight'), frame.right)
        gl.uniform3fv(backdropUniform('uDown'), frame.down)
        gl.uniform3fv(backdropUniform('uBack'), frame.back)
        gl.uniform1f(backdropUniform('uFocal'), frame.focal)
        gl.uniform2f(backdropUniform('uHalf'), size.width / 2, size.height / 2)
        gl.uniform1f(backdropUniform('uYawOffset'), backdrop.yawOffset)
        gl.uniform3fv(backdropUniform('uTone'), backdrop.tone)
        gl.bindVertexArray(backdropArray)
        gl.drawArrays(gl.TRIANGLES, 0, 3)
        gl.bindTexture(gl.TEXTURE_2D, null)
      }

      // 아주 먼 곳의 그림들(은하 · 성운): 파노라마 위, 입자 · 선 아래
      for (const image of far) {
        const texture = farTextures.get(image.id)
        if (!texture || image.tone[3] <= 0) continue
        gl.useProgram(farProgram)
        setProjection(farUniform, frame)
        gl.activeTexture(gl.TEXTURE0)
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture)
        gl.uniform1i(farUniform('uFrames'), 0)
        gl.uniform3fv(farUniform('uCenter'), image.center)
        gl.uniform2fv(farUniform('uSize'), image.size)
        gl.uniform4fv(farUniform('uLayers'), image.layers)
        gl.uniform3fv(farUniform('uWeights'), image.weights)
        gl.uniform4fv(farUniform('uTone'), image.tone)
        gl.uniform2fv(farUniform('uMask'), image.mask)
        gl.uniform4fv(farUniform('uDisk'), image.disk)
        gl.uniform2fv(farUniform('uSpin'), image.spin)
        gl.uniform1f(farUniform('uCoolKey'), image.coolKey)
        gl.uniform1f(farUniform('uContrast'), image.contrast)
        gl.uniform2fv(farUniform('uBottomFade'), image.bottomFade)
        gl.bindVertexArray(backdropArray)
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
        gl.bindTexture(gl.TEXTURE_2D_ARRAY, null)
      }

      if (lineVertices > 0) {
        gl.useProgram(lineProgram)
        setProjection(lineUniform, frame)
        gl.uniform3fv(lineUniform('uColor'), frame.lineColor)
        gl.bindVertexArray(lineArray)
        gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, lines.subarray(0, lineVertices * LINE_STRIDE), gl.DYNAMIC_DRAW)
        gl.drawArrays(gl.LINES, 0, lineVertices)
      }

      gl.useProgram(pointProgram)
      setProjection(pointUniform, frame)
      gl.uniform1f(pointUniform('uDpr'), size.ratio)
      gl.uniform1f(pointUniform('uTime'), frame.time)
      gl.uniform1f(pointUniform('uFocusDist'), frame.focusDistance)
      gl.uniform1f(pointUniform('uDrift'), frame.drift)
      gl.uniform3fv(pointUniform('uPointer'), frame.pointer)
      gl.uniform1f(pointUniform('uRepelRadius'), frame.repelRadius)
      gl.uniform1f(pointUniform('uRepelPx'), frame.repelPx)
      gl.uniform4fv(pointUniform('uBreath'), frame.breath)
      gl.uniform4fv(pointUniform('uAware'), frame.aware)
      gl.uniform3fv(pointUniform('uAwareEffect'), frame.awareEffect)
      gl.uniform3fv(pointUniform('uWrap'), frame.wrap)
      gl.uniform2f(pointUniform('uWrapShape'), frame.wrapRadius, frame.wrapPx)
      gl.uniform1f(pointUniform('uBlurPx'), frame.blurPx)
      gl.uniform1f(pointUniform('uMaxPoint'), frame.maxPoint)
      gl.uniform1f(pointUniform('uGlow'), frame.glow)
      gl.uniform1f(pointUniform('uTwinkle'), frame.twinkle)
      gl.uniform4fv(pointUniform('uStarPeriod'), frame.starPeriod)
      gl.uniform4fv(pointUniform('uStarFade'), frame.starFade)
      gl.uniform1f(pointUniform('uStarHalo'), frame.starHalo)
      gl.uniform1f(pointUniform('uTwinkleLift'), frame.twinkleLift)
      gl.uniform3fv(pointUniform('uStarDrift'), frame.starDrift)
      gl.uniform4fv(pointUniform('uSparkle'), frame.sparkle)
      gl.uniform2fv(pointUniform('uFlareSec'), frame.flareSec)
      gl.uniform1f(pointUniform('uStarShare'), frame.starShare)
      gl.uniform4fv(pointUniform('uMoveFrom'), frame.moveFrom)
      gl.uniform3fv(pointUniform('uMoveBy'), frame.moveBy)
      gl.uniform3fv(pointUniform('uMoveVelocity'), frame.moveVelocity)
      gl.uniform3fv(pointUniform('uTrail'), frame.trail)
      gl.bindVertexArray(pointArray)
      gl.drawArrays(gl.POINTS, 0, Math.floor(particleCount * particleFraction))

      const meteorVertices = meteor.streakVertices + meteor.burstVertices
      if (meteorVertices > 0) {
        gl.useProgram(streakProgram)
        gl.uniform2f(streakUniform('uHalf'), size.width / 2, size.height / 2)
        gl.uniform3fv(streakUniform('uColor'), frame.streakColor)
        gl.uniform1f(streakUniform('uBurstKind'), meteor.burstKind)
        gl.uniform1f(streakUniform('uBurstPx'), meteor.burstPx)
        gl.uniform1f(streakUniform('uBurstPhase'), meteor.burstPhase)
        gl.uniform2fv(streakUniform('uBurstDir'), meteor.burstDir)
        gl.uniform1f(streakUniform('uBurstSeed'), meteor.burstSeed)
        gl.uniform4fv(streakUniform('uCover'), frame.covers)
        gl.uniform1i(streakUniform('uCoverCount'), frame.coverCount)
        gl.uniform1f(streakUniform('uCoverInner'), frame.coverInner)
        gl.bindVertexArray(streakArray)
        gl.bindBuffer(gl.ARRAY_BUFFER, streakBuffer)
        gl.bufferData(gl.ARRAY_BUFFER, meteor.vertices.subarray(0, meteorVertices * STREAK_STRIDE), gl.DYNAMIC_DRAW)
        if (meteor.streakVertices > 0) {
          gl.uniform1f(streakUniform('uShape'), 0)
          gl.drawArrays(gl.TRIANGLE_STRIP, 0, meteor.streakVertices)
        }
        if (meteor.burstVertices > 0) {
          gl.uniform1f(streakUniform('uShape'), 1)
          gl.drawArrays(gl.TRIANGLE_STRIP, meteor.streakVertices, meteor.burstVertices)
        }
      }
      gl.bindVertexArray(null)
    },

    dispose() {
      gl.deleteBuffer(pointBuffer)
      gl.deleteBuffer(lineBuffer)
      gl.deleteBuffer(streakBuffer)
      gl.deleteVertexArray(pointArray)
      gl.deleteVertexArray(lineArray)
      gl.deleteVertexArray(streakArray)
      gl.deleteProgram(pointProgram)
      gl.deleteProgram(lineProgram)
      gl.deleteProgram(streakProgram)
      gl.deleteProgram(backdropProgram)
      gl.deleteProgram(farProgram)
      farTextures.forEach((texture) => gl.deleteTexture(texture))
      gl.deleteVertexArray(backdropArray)
      if (backdropTexture) gl.deleteTexture(backdropTexture)
    },
  }
}
