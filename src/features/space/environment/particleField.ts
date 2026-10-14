import { spaceConfig } from '@/config/space'
import { oklchToRgb, readColorToken, type Rgb } from '@/utils/color'
import { between, seededRandom } from '@/utils/random'
import type { SpaceLayout } from '../scene/layout'

/**
 * 공간을 채우는 입자의 배치. 세 무리로 이루어진다.
 * - far: 아주 먼 점. 카메라가 움직여도 거의 그대로여서 깊이의 기준이 된다.
 * - dust: 공간 전체에 흩어진 먼지. 이동할 때 곁을 지나간다.
 * - cluster: 성단 중심에 모인 입자 무리. 성단의 색이 아주 옅게 묻는다.
 * far · dust는 화면에서 일정한 크기의 별(별가루 · 반짝이는 별)이고, 성단 둘레에 가끔 빛살을 내는 별이 몇 개 더 있다.
 * 그리는 방법(셰이더)은 glRenderer에, 수와 크기는 config/space.ts에 있다.
 */

/**
 * 입자 하나의 값: x y z · size · r g b a · seed · blur(커서 · 감싸기 · 초점에 반응하는 정도)
 * · 속한 성단의 중심 x y z와 반지름(성단 입자가 아니면 자기 위치와 0) · 그 성단의 박자(0 ~ 1)
 * · 별의 종류(StarKind) · 빛살을 내는 별의 차례 번호
 * 성단 입자의 size는 world, 별의 size는 화면 px다.
 */
export const PARTICLE_STRIDE = 17

/** 셰이더가 읽는 별의 종류(shaders.ts와 같은 번호). 성단 입자는 none이다 */
export const StarKind = { none: 0, micro: 1, twinkle: 2, sparkle: 3 } as const

const config = spaceConfig.particles
const stars = config.stars
const FIELD_SEED = 'h-archive-void'

/** buildParticleField가 실제로 읽는 배치 입력. 이름/메모 수정은 입자를 재생성하지 않는다. */
export function particleFieldKey(layout: SpaceLayout): string {
  return JSON.stringify([layout.bounds, layout.clusters.map((cluster) => [
    cluster.category.hue, cluster.nodes.length, cluster.x, cluster.y, cluster.z, cluster.radius, cluster.seed,
  ])])
}

interface Particle {
  x: number
  y: number
  z: number
  size: number
  color: Rgb
  alpha: number
  blur: number
  kind: number
  /** 빛살을 내는 별만: 0부터의 차례 번호 */
  rank?: number
  /** 성단에 속한 입자만: 그 성단의 중심 · 반지름 · 박자. 숨과 커서 반응이 성단 단위로 일어나게 한다 */
  home?: { x: number; y: number; z: number; radius: number; seed: number }
}

/** 평균 0 근처에 모이는 값(-1 ~ 1). 무리의 가운데가 짙고 바깥이 옅어진다. */
function gather(random: () => number): number {
  return (random() + random() + random() - 1.5) / 1.5
}

/** 배경 점 하나의 종류와 크기(px): 대부분은 별가루, 일부(twinkleShare)는 반짝이는 별 */
function backgroundStar(random: () => number, scale: number, twinkleShare: number): { kind: number; size: number } {
  const twinkle = random() < twinkleShare
  return {
    kind: twinkle ? StarKind.twinkle : StarKind.micro,
    size: between(random, twinkle ? stars.twinkle.size : stars.micro.size) * scale,
  }
}

/**
 * @param density 입자 밀도(모션 설정)
 * @param scale 화면 배율. 넓은 화면에서 점이 작아 보이지 않게 크기에 곱한다
 * @param twinkleShare 배경 점 중 반짝이는 별의 비율(별빛 생동감). 바꿔도 점의 자리는 그대로다
 */
export function buildParticleField(
  layout: SpaceLayout,
  density: number,
  scale: number,
  twinkleShare: number = stars.levels[0].twinkleShare,
): Float32Array {
  const random = seededRandom(FIELD_SEED)
  const starColor = readColorToken('--particle-star')
  const dustColor = readColorToken('--particle-dust')
  // 범위를 격자로 끊어 잡아, 성단을 조금 옮겨도 배경 점과 먼지가 그대로 있게 한다
  const grid = config.fieldGrid
  const bounds = {
    minX: Math.floor(layout.bounds.minX / grid) * grid,
    maxX: Math.ceil(layout.bounds.maxX / grid) * grid,
    minY: Math.floor(layout.bounds.minY / grid) * grid,
    maxY: Math.ceil(layout.bounds.maxY / grid) * grid,
  }
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerY = (bounds.minY + bounds.maxY) / 2
  const particles: Particle[] = []

  for (let index = 0; index < config.far.count * density; index++) {
    // 구 위에 고르게: 높이(cos)를 고르게 뽑고 둘레 각을 고르게 뽑는다
    const height = random() * 2 - 1
    const around = random() * Math.PI * 2
    const ring = Math.sqrt(1 - height * height)
    const distance = between(random, config.far.radius)
    particles.push({
      x: centerX + Math.cos(around) * ring * distance,
      y: centerY + Math.sin(around) * ring * distance,
      z: height * distance,
      ...backgroundStar(random, scale, twinkleShare),
      color: starColor,
      alpha: between(random, config.far.alpha),
      blur: 0,
    })
  }

  const dustWidth = bounds.maxX - bounds.minX + config.dust.margin * 2
  const dustHeight = bounds.maxY - bounds.minY + config.dust.margin * 2
  for (let index = 0; index < config.dust.count * density; index++) {
    particles.push({
      x: centerX + (random() - 0.5) * dustWidth,
      y: centerY + (random() - 0.5) * dustHeight,
      z: between(random, config.dust.depth),
      ...backgroundStar(random, scale, twinkleShare),
      color: dustColor,
      alpha: between(random, config.dust.alpha),
      blur: 1,
    })
  }

  for (const cluster of layout.clusters) {
    const count = Math.min(config.cluster.base + cluster.nodes.length * config.cluster.perProject, config.cluster.max)
    const tint = oklchToRgb(0.86, config.cluster.chroma, cluster.category.hue)
    const reach = cluster.radius * config.cluster.radiusFactor
    const home = { x: cluster.x, y: cluster.y, z: cluster.z, radius: cluster.radius, seed: cluster.seed }
    for (let index = 0; index < count * density; index++) {
      particles.push({
        x: cluster.x + gather(random) * reach,
        y: cluster.y + gather(random) * reach,
        z: cluster.z + gather(random) * reach * config.cluster.depthFactor,
        size: between(random, config.cluster.size) * scale,
        color: tint,
        alpha: between(random, config.cluster.alpha),
        blur: 0.7,
        kind: StarKind.none,
        home,
      })
    }
  }

  // 빛살을 내는 별: 성단 둘레에 돌아가며 놓는다(성단 근처에서 조금 더 자주 보인다). 성단이 없으면 먼지 사이에 둔다
  for (let rank = 0; rank < stars.sparkle.count; rank++) {
    const cluster = layout.clusters[rank % Math.max(layout.clusters.length, 1)]
    const around = random() * Math.PI * 2
    const reach = cluster ? cluster.radius * between(random, stars.sparkle.spread) : 0
    particles.push({
      x: cluster ? cluster.x + Math.cos(around) * reach : centerX + (random() - 0.5) * dustWidth,
      y: cluster ? cluster.y + Math.sin(around) * reach : centerY + (random() - 0.5) * dustHeight,
      z: cluster ? cluster.z + (random() - 0.5) * cluster.radius : between(random, config.dust.depth),
      size: between(random, stars.sparkle.size) * scale,
      color: starColor,
      alpha: between(random, stars.sparkle.alpha),
      blur: 0,
      kind: StarKind.sparkle,
      rank,
    })
  }

  // 품질 단계가 앞쪽 일부만 그려도 세 무리의 비율이 유지되도록 섞는다
  for (let index = particles.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1))
    ;[particles[index], particles[swap]] = [particles[swap], particles[index]]
  }

  const data = new Float32Array(particles.length * PARTICLE_STRIDE)
  particles.forEach((particle, index) => {
    data.set(
      [
        particle.x,
        particle.y,
        particle.z,
        particle.size,
        ...particle.color,
        particle.alpha,
        random(),
        particle.blur,
        particle.home?.x ?? particle.x,
        particle.home?.y ?? particle.y,
        particle.home?.z ?? particle.z,
        particle.home?.radius ?? 0,
        particle.home?.seed ?? 0,
        particle.kind,
        particle.rank ?? 0,
      ],
      index * PARTICLE_STRIDE,
    )
  })
  return data
}
