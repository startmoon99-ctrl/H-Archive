import { describe, expect, it } from 'vitest'
import { loadPlacements } from './placementStore'

describe('loadPlacements', () => {
  it('저장된 값이 없거나 깨졌으면 비어 있다(모두 자동 배치)', () => {
    expect(loadPlacements(null)).toEqual({})
    expect(loadPlacements('{not json')).toEqual({})
    expect(loadPlacements('[1, 2]')).toEqual({})
  })

  it('숫자가 온전한 항목만 쓴다', () => {
    const raw = JSON.stringify({
      a: { along: 10, across: -20, z: 5 },
      b: { along: 'x', across: 0, z: 0 },
      c: { along: 1, across: 2 },
      d: null,
    })
    expect(loadPlacements(raw)).toEqual({ a: { along: 10, across: -20, z: 5 } })
  })
})
