export type Rgb = [number, number, number]

/** CSS 변수(#rrggbb)를 0 ~ 1 범위의 RGB로 읽는다. 캔버스 · WebGL이 디자인 토큰의 색을 쓰게 한다. */
export function readColorToken(name: string): Rgb {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  const hex = /^#([0-9a-f]{6})$/i.exec(value)?.[1]
  if (!hex) return [1, 1, 1]
  return [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255) as Rgb
}

function toGamma(linear: number): number {
  const value = Math.min(Math.max(linear, 0), 1)
  return value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055
}

/** CSS의 oklch(l c h)와 같은 색을 0 ~ 1 범위의 RGB로 */
export function oklchToRgb(lightness: number, chroma: number, hueDeg: number): Rgb {
  const hue = (hueDeg * Math.PI) / 180
  const a = chroma * Math.cos(hue)
  const b = chroma * Math.sin(hue)
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3
  return [
    toGamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    toGamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    toGamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ]
}
