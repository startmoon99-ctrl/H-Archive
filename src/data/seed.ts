import type { ProjectStatusId } from '@/config/catalog'
import type { ArchiveSnapshot, Category, ISODate, MediaAsset, MediaSource, Project, TimelineEntry } from '@/types/archive'
import { seededRandom } from '@/utils/random'

/**
 * 첫 실행 때만 들어가는 샘플 기록. 구조와 분위기를 확인하기 위한 것이며
 * 설정 → 데이터에서 한 번에 비울 수 있다. 실제 파일 대신 생성한 SVG 그림을 쓴다.
 */

interface SeedEntry {
  date: ISODate
  title: string
  memo: string
  version?: string
  tech?: string[]
  art?: boolean
}

interface SeedProject {
  title: string
  description: string
  status: ProjectStatusId
  tags: string[]
  entries: SeedEntry[]
}

interface SeedCategory {
  name: string
  description: string
  hue: number
  projects: SeedProject[]
}

const SEED: SeedCategory[] = [
  {
    name: 'Game',
    description: '직접 만들어 본 게임과 그 과정',
    hue: 285,
    projects: [
      {
        title: '길 만드는 디펜스',
        description: '몬스터가 지나갈 길을 플레이어가 직접 깔아 가는 디펜스 게임',
        status: 'in-progress',
        tags: ['디펜스', '프로토타입'],
        entries: [
          {
            date: '2026-09-29',
            title: '첫 아이디어',
            memo: '길을 직접 만드는 디펜스 게임을 만들고 싶었다. 타워가 아니라 길이 주인공인 게임.',
            art: true,
          },
          {
            date: '2026-10-01',
            title: '첫 프로토타입',
            memo: '실제로 만들어보니 생각했던 구조와 달랐다. 길을 깔 때마다 경로를 다시 계산하는 게 문제였다.',
            version: 'v0.1',
            tech: ['Canvas', 'TypeScript'],
            art: true,
          },
          {
            date: '2026-10-06',
            title: '구조 변경',
            memo: '수정하기 쉬운 구조로 다시 만들었다. 타일 데이터와 화면 그리기를 분리했다.',
            version: 'v0.2',
            tech: ['A* 경로 탐색'],
            art: true,
          },
          {
            date: '2026-10-11',
            title: '현재 버전',
            memo: '웨이브 세 개까지는 재미있다. 네 번째부터 지루해지는 이유를 아직 모르겠다.',
            version: 'v0.3',
          },
        ],
      },
      {
        title: '별 줍기',
        description: '떨어지는 별을 받아내는 한 손 아케이드',
        status: 'complete',
        tags: ['아케이드', '웹게임'],
        entries: [
          { date: '2025-03-14', title: '주말 하루 만에', memo: '처음으로 끝까지 완성해 본 게임. 작아도 끝내는 경험이 필요했다.', version: 'v1.0', tech: ['HTML', 'Canvas'], art: true },
          { date: '2025-03-20', title: '점수판 추가', memo: '친구가 내 점수를 넘기려고 30분을 붙잡고 있었다. 그걸 보는 게 제일 좋았다.', version: 'v1.1' },
        ],
      },
      {
        title: '던전 한 칸',
        description: '방 하나에서 모든 것이 일어나는 로그라이크 구상',
        status: 'idea',
        tags: ['기획', '로그라이크'],
        entries: [{ date: '2024-11-02', title: '메모 한 장', memo: '방을 넓히는 대신 방 하나를 깊게 만들면 어떨까.' }],
      },
    ],
  },
  {
    name: 'Web',
    description: '웹사이트와 도구',
    hue: 255,
    projects: [
      {
        title: 'H Archive',
        description: '지금 보고 있는 이 공간',
        status: 'in-progress',
        tags: ['아카이브', 'React'],
        entries: [
          { date: '2026-10-05', title: '메모 그래프로 시작', memo: 'Obsidian처럼 연결되는 아카이브를 먼저 만들어 봤다. 기능은 됐지만 다시 들어오고 싶은 공간은 아니었다.', version: 'prototype', tech: ['React', 'd3-force'], art: true },
          { date: '2026-10-12', title: '공간으로 다시', memo: '저장소가 아니라 내가 만들어온 것들을 바라보는 공간이었으면 했다. 처음부터 다시 만들기로 했다.', version: 'v0.1', tech: ['Canvas', 'IndexedDB'], art: true },
        ],
      },
      {
        title: '포트폴리오 2024',
        description: '처음으로 혼자 배포까지 해 본 사이트',
        status: 'complete',
        tags: ['포트폴리오'],
        entries: [
          { date: '2024-06-18', title: '첫 배포', memo: '주소창에 내 도메인을 치고 사이트가 뜨던 순간을 아직 기억한다.', version: 'v1.0', tech: ['HTML', 'CSS'], art: true },
        ],
      },
    ],
  },
  {
    name: 'AI Photo',
    description: 'AI로 만든 이미지 연작',
    hue: 350,
    projects: [
      {
        title: '새벽의 도시',
        description: '사람이 없는 새벽 네 시의 거리',
        status: 'complete',
        tags: ['연작', '도시'],
        entries: [
          { date: '2025-08-03', title: '첫 장', memo: '프롬프트보다 빛의 방향을 정하는 게 먼저라는 걸 알았다.', art: true },
          { date: '2025-08-09', title: '열두 장으로', memo: '한 장씩은 좋은데 나란히 두면 색이 흩어진다. 팔레트를 먼저 정했어야 했다.', art: true },
        ],
      },
      {
        title: '유리 온실',
        description: '빛이 통과하는 식물과 유리',
        status: 'paused',
        tags: ['식물', '빛'],
        entries: [{ date: '2026-02-21', title: '실험', memo: '투명한 것을 그리게 하는 건 생각보다 어렵다.', art: true }],
      },
    ],
  },
  {
    name: 'Drama',
    description: '영상 작품과 시나리오',
    hue: 70,
    projects: [
      {
        title: '단편 〈정류장〉',
        description: '막차를 놓친 두 사람의 8분',
        status: 'in-progress',
        tags: ['단편', '시나리오'],
        entries: [
          { date: '2026-04-10', title: '시놉시스', memo: '대사가 없는 장면이 가장 길었으면 좋겠다.' },
          { date: '2026-05-02', title: '콘티 1차', memo: '그려 보니 장면이 너무 많다. 정류장을 떠나지 않기로 했다.', version: '1고', art: true },
        ],
      },
    ],
  },
  {
    name: 'Video',
    description: '짧은 영상 기록',
    hue: 190,
    projects: [
      {
        title: '제주 타임랩스',
        description: '사흘 동안 찍은 하늘',
        status: 'complete',
        tags: ['타임랩스', '여행'],
        entries: [{ date: '2025-10-19', title: '편집 완료', memo: '찍을 때는 지루했는데 붙여 놓으니 사흘이 40초가 됐다.', art: true }],
      },
      {
        title: '작업실 기록 0화',
        description: '책상 위에서 일어나는 일',
        status: 'idea',
        tags: ['브이로그'],
        entries: [{ date: '2026-07-07', title: '찍어만 둠', memo: '편집은 아직. 언젠가의 나에게 맡긴다.' }],
      },
    ],
  },
]

/** 샘플 그림을 바꾸면 올린다. 이미 저장된 샘플도 다음 실행 때 새 그림으로 바뀐다(refreshSeedArt). */
export const SEED_ART_VERSION = 2

const SEED_ART_PREFIX = 'data:image/svg+xml,'
const ART_WIDTH = 640
const ART_HEIGHT = 400

/** 그림마다 하나씩 들어가는 가는 선의 형태 */
const ART_MARKS: ((random: () => number) => string)[] = [
  // 화면보다 큰 원의 일부
  (random) => {
    const radius = 240 + random() * 220
    return `<circle cx="${ART_WIDTH * random()}" cy="${ART_HEIGHT * (0.6 + random())}" r="${radius}" fill="none" stroke="#fff" stroke-opacity="0.3"/>`
  },
  // 비스듬히 지나가는 평행선
  (random) => {
    const offset = random() * 160
    return Array.from({ length: 5 }, (_, line) => {
      const x = offset + line * 34
      return `<line x1="${x}" y1="${ART_HEIGHT}" x2="${x + 260}" y2="0" stroke="#fff" stroke-opacity="${0.26 - line * 0.04}"/>`
    }).join('')
  },
  // 세로로 선 빛의 틈
  (random) => {
    const x = ART_WIDTH * (0.25 + random() * 0.5)
    return `<rect x="${x}" y="0" width="1.5" height="${ART_HEIGHT}" fill="#fff" opacity="0.55"/><rect x="${x - 14}" y="0" width="30" height="${ART_HEIGHT}" fill="#fff" opacity="0.07"/>`
  },
  // 수평선
  (random) => {
    const y = ART_HEIGHT * (0.45 + random() * 0.3)
    return `<line x1="0" y1="${y}" x2="${ART_WIDTH}" y2="${y}" stroke="#fff" stroke-opacity="0.34"/>`
  },
]

/**
 * hue와 seed로 만드는 추상 그림: 어둠 속에 번진 빛 두 덩이와 가는 선 하나.
 * 같은 seed면 항상 같은 그림이 나온다.
 */
function seedArt(hue: number, seed: string): MediaSource {
  const random = seededRandom(seed)
  const at = (max: number) => Math.round(random() * max)
  const mark = ART_MARKS[Math.floor(random() * ART_MARKS.length)](random)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ART_WIDTH} ${ART_HEIGHT}" preserveAspectRatio="xMidYMid slice">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="oklch(0.17 0.03 ${hue})"/><stop offset="1" stop-color="oklch(0.07 0.015 ${hue})"/></linearGradient>
<linearGradient id="shade" x1="0" y1="0" x2="0" y2="1"><stop offset="0.5" stop-color="#010204" stop-opacity="0"/><stop offset="1" stop-color="#010204" stop-opacity="0.7"/></linearGradient>
<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="46"/></filter>
</defs>
<rect width="${ART_WIDTH}" height="${ART_HEIGHT}" fill="url(#bg)"/>
<g filter="url(#soft)">
<ellipse cx="${at(ART_WIDTH)}" cy="${at(ART_HEIGHT)}" rx="${150 + at(120)}" ry="${70 + at(70)}" fill="oklch(0.7 0.09 ${hue})" opacity="0.6" transform="rotate(${at(180)} ${ART_WIDTH / 2} ${ART_HEIGHT / 2})"/>
<ellipse cx="${at(ART_WIDTH)}" cy="${at(ART_HEIGHT)}" rx="${60 + at(70)}" ry="${40 + at(50)}" fill="oklch(0.95 0.03 ${hue + 30})" opacity="0.5"/>
</g>
${mark}
<rect width="${ART_WIDTH}" height="${ART_HEIGHT}" fill="url(#shade)"/>
</svg>`
  return { type: 'url', url: `${SEED_ART_PREFIX}${encodeURIComponent(svg)}` }
}

const SEED_MEDIA_SUFFIX = '-m'

/**
 * 저장되어 있는 샘플 프로젝트의 그림을 지금의 seedArt로 다시 그린다.
 * 사용자가 올린 파일은 건드리지 않는다(샘플이 만든 SVG 그림만 대상이다). 바뀐 것이 없으면 null.
 */
export function refreshSeedArt(project: Project, hue: number): Project | null {
  let changed = false
  const timeline = project.timeline.map((entry) => ({
    ...entry,
    media: entry.media.map((asset) => {
      const isSeedArt =
        asset.id.endsWith(SEED_MEDIA_SUFFIX) &&
        asset.thumbnail?.type === 'url' &&
        asset.thumbnail.url.startsWith(SEED_ART_PREFIX)
      if (!isSeedArt) return asset
      changed = true
      const art = seedArt(hue, asset.id.slice(0, -SEED_MEDIA_SUFFIX.length))
      return { ...asset, original: art, thumbnail: art }
    }),
  }))
  return changed ? { ...project, timeline } : null
}

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9가-힣]+/g, '-')
}

export function createSeed(): ArchiveSnapshot {
  const categories: Category[] = []
  const projects: Project[] = []

  SEED.forEach((seedCategory, categoryIndex) => {
    const categoryId = `seed-${slug(seedCategory.name)}`
    const first = seedCategory.projects.flatMap((project) => project.entries.map((entry) => entry.date)).sort()[0]
    categories.push({
      id: categoryId,
      name: seedCategory.name,
      description: seedCategory.description,
      hue: seedCategory.hue,
      // 성단은 만든 순서대로 나선에 놓인다
      createdAt: new Date(Date.UTC(2024, 0, 1 + categoryIndex)).toISOString(),
    })

    seedCategory.projects.forEach((seedProject, projectIndex) => {
      const projectId = `${categoryId}-${projectIndex}`
      const timeline: TimelineEntry[] = seedProject.entries.map((entry, entryIndex) => {
        const entryId = `${projectId}-e${entryIndex}`
        const art = entry.art ? seedArt(seedCategory.hue, entryId) : undefined
        const media: MediaAsset[] = art
          ? [{ id: `${entryId}${SEED_MEDIA_SUFFIX}`, kind: 'image', name: `${entry.title}.svg`, mimeType: 'image/svg+xml', size: 0, original: art, thumbnail: art }]
          : []
        return {
          id: entryId,
          date: entry.date,
          title: entry.title,
          memo: entry.memo,
          version: entry.version ?? '',
          tech: entry.tech ?? [],
          links: [],
          media,
        }
      })
      const startedAt = timeline[0]?.date ?? first
      const updatedAt = `${timeline.at(-1)?.date ?? startedAt}T00:00:00.000Z`
      projects.push({
        id: projectId,
        title: seedProject.title,
        categoryId,
        description: seedProject.description,
        status: seedProject.status,
        startedAt,
        createdAt: `${startedAt}T00:00:00.000Z`,
        updatedAt,
        coverMediaId: null,
        tags: seedProject.tags,
        links: [],
        timeline,
      })
    })
  })

  return { categories, projects }
}
