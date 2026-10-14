import { describe, expect, it } from 'vitest'
import { categoryFixture } from '@/test/archiveFixtures'
import type { SpaceLayout } from '../scene/layout'
import { particleFieldKey } from './particleField'

function layout(): SpaceLayout {
  return {
    bounds: { minX: -100, maxX: 100, minY: -100, maxY: 100 },
    overview: { x: 0, y: 0, z: 0, zoom: 1 },
    clusters: [{ category: categoryFixture(), x: 1, y: 2, z: 3, radius: 10, seed: 0.5, nodes: [], focus: { x: 0, y: 0, z: 0, zoom: 1 } }],
  }
}

describe('particle field invalidation', () => {
  it('색·반지름·깊이·미세 좌표·박자·범위 변경을 모두 반영한다', () => {
    const original = particleFieldKey(layout())
    const changes: ((value: SpaceLayout) => void)[] = [
      (value) => { value.clusters[0].category.hue += 1 },
      (value) => { value.clusters[0].radius += 1 },
      (value) => { value.clusters[0].z += 1 },
      (value) => { value.clusters[0].x += 0.001 },
      (value) => { value.clusters[0].seed += 0.01 },
      (value) => { value.bounds.maxY += 1 },
    ]
    for (const change of changes) {
      const value = layout()
      change(value)
      expect(particleFieldKey(value)).not.toBe(original)
    }
  })

  it('입자에 영향을 주지 않는 이름 변경은 재생성하지 않는다', () => {
    const value = layout()
    const before = particleFieldKey(value)
    value.clusters[0].category.name = '새 이름'
    expect(particleFieldKey(value)).toBe(before)
  })
})
