import type { MeteorFrame } from './meteors'
import { PARTICLE_STRIDE } from './particleField'
import { LINE_FRAGMENT, LINE_VERTEX, POINT_FRAGMENT, POINT_VERTEX, STREAK_FRAGMENT, STREAK_VERTEX } from './shaders'

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

export interface GlRenderer {
  /** 화면 크기(CSS px)와 실제로 그릴 해상도 배율 */
  resize(width: number, height: number, ratio: number): void
  setParticles(data: Float32Array): void
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

    draw(frame, particleFraction, lines, lineVertices, meteor) {
      gl.clear(gl.COLOR_BUFFER_BIT)

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
    },
  }
}
