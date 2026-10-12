/** 문자열을 32bit 정수로 */
export function hashString(text: string): number {
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

/** 같은 seed면 항상 같은 수열을 돌려주는 난수(mulberry32). 배치와 색이 새로고침마다 바뀌지 않게 한다. */
export function seededRandom(seed: string | number): () => number {
  let state = typeof seed === 'number' ? seed >>> 0 : hashString(seed)
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function between(random: () => number, range: readonly [number, number]): number {
  return range[0] + (range[1] - range[0]) * random()
}
