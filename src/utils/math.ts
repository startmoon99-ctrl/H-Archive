export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t
}

/** 음수에도 0 ~ n 범위를 돌려주는 나머지 */
export function mod(value: number, n: number): number {
  return ((value % n) + n) % n
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/** 프레임 길이에 상관없이 같은 속도로 따라가게 하는 보간 비율 */
export function smoothing(perFrame: number, dt: number): number {
  return 1 - (1 - perFrame) ** (dt / 16)
}
