import { describe, expect, it } from 'vitest'
import { createArrangement } from './arrangement'
import type { SpaceLayout } from './layout'

const layoutAt = (positions: Record<string, [number, number, number]>) =>
  ({
    clusters: Object.entries(positions).map(([id, [x, y, z]]) => ({ category: { id }, x, y, z })),
  }) as unknown as SpaceLayout

const run = (arrangement: ReturnType<typeof createArrangement>, layout: SpaceLayout, frames: number) => {
  for (let index = 0; index < frames; index++) arrangement.update(layout, 16)
}

describe('arrangement', () => {
  it('옮기지 않은 성단은 배치 그대로(따로 기억하지 않는다)', () => {
    const arrangement = createArrangement()
    run(arrangement, layoutAt({ a: [0, 0, 0] }), 3)
    expect(arrangement.positionOf('a')).toBeNull()
    expect(arrangement.moving()).toEqual([])
  })

  it('끄는 성단은 손을 감쇠하며 따라가고, 움직이는 동안 속도가 있다', () => {
    const arrangement = createArrangement()
    const layout = layoutAt({ a: [0, 0, 0] })
    run(arrangement, layout, 1)
    arrangement.hold('a', { x: 0, y: 0, z: 0 })
    arrangement.moveTo({ x: 100, y: 0, z: 0 })
    arrangement.update(layout, 16)
    const first = arrangement.positionOf('a')!
    expect(first.x).toBeGreaterThan(0)
    expect(first.x).toBeLessThan(100)
    expect(arrangement.moving()[0].vx).toBeGreaterThan(0)
    run(arrangement, layout, 120)
    expect(arrangement.positionOf('a')!.x).toBeCloseTo(100, 0)
  })

  it('놓은 자리가 배치에 반영될 때까지 예전 자리로 끌려가지 않고, 반영되면 배치에 맡긴다', () => {
    const arrangement = createArrangement()
    run(arrangement, layoutAt({ a: [0, 0, 0] }), 1)
    arrangement.hold('a', { x: 0, y: 0, z: 0 })
    arrangement.moveTo({ x: 100, y: 0, z: 0 })
    run(arrangement, layoutAt({ a: [0, 0, 0] }), 120)
    expect(arrangement.release()).toEqual({ x: 100, y: 0, z: 0 })
    run(arrangement, layoutAt({ a: [0, 0, 0] }), 2)
    expect(arrangement.positionOf('a')!.x).toBeGreaterThan(99)
    run(arrangement, layoutAt({ a: [100, 0, 0] }), 3)
    expect(arrangement.positionOf('a')).toBeNull()
  })

  it('배치가 바뀌면(취소 · 자동 배치) 지금 자리에서 새 자리로 부드럽게 옮겨 간다', () => {
    const arrangement = createArrangement()
    run(arrangement, layoutAt({ a: [0, 0, 0] }), 1)
    arrangement.update(layoutAt({ a: [200, 0, 0] }), 16)
    const step = arrangement.positionOf('a')!
    expect(step.x).toBeGreaterThanOrEqual(0)
    expect(step.x).toBeLessThan(200)
    run(arrangement, layoutAt({ a: [200, 0, 0] }), 200)
    expect(arrangement.positionOf('a')).toBeNull()
  })

  it('없어진 성단은 잊는다', () => {
    const arrangement = createArrangement()
    run(arrangement, layoutAt({ a: [0, 0, 0] }), 1)
    arrangement.hold('a', { x: 0, y: 0, z: 0 })
    arrangement.release()
    run(arrangement, layoutAt({}), 1)
    expect(arrangement.positionOf('a')).toBeNull()
  })
})
