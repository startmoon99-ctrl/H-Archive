import type { ProjectStatusId } from '@/config/catalog'
import type { ArchiveSnapshot, Category, ISODate, MediaAsset, MediaSource, Project, TimelineEntry } from '@/types/archive'
import { seededRandom } from '@/utils/random'

/**
 * 첫 실행 때만 들어가는 샘플 은하. 구조와 분위기를 확인하기 위한 것이며
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
        description: '지금 보고 있는 이 은하',
        status: 'in-progress',
        tags: ['아카이브', 'React'],
        entries: [
          { date: '2026-10-05', title: '메모 그래프로 시작', memo: 'Obsidian처럼 연결되는 아카이브를 먼저 만들어 봤다. 기능은 됐지만 다시 들어오고 싶은 공간은 아니었다.', version: 'prototype', tech: ['React', 'd3-force'], art: true },
          { date: '2026-10-12', title: '은하로 다시', memo: '저장소가 아니라 내가 만들어온 것들을 바라보는 공간이었으면 했다. 처음부터 다시 만들기로 했다.', version: 'v0.1', tech: ['Canvas', 'IndexedDB'], art: true },
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

/** hue와 seed로 만드는 추상적인 우주 그림 */
function seedArt(hue: number, seed: string): MediaSource {
  const random = seededRandom(seed)
  const at = (max: number) => Math.round(random() * max)
  const stars = Array.from({ length: 26 }, () => {
    const radius = (0.6 + random() * 1.6).toFixed(1)
    return `<circle cx="${at(640)}" cy="${at(400)}" r="${radius}" fill="#fff" opacity="${(0.25 + random() * 0.6).toFixed(2)}"/>`
  }).join('')
  const planetX = 160 + at(320)
  const planetY = 120 + at(160)
  const planetR = 46 + at(60)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400" preserveAspectRatio="xMidYMid slice">
<defs>
<radialGradient id="a" cx="${20 + at(60)}%" cy="${20 + at(60)}%" r="85%"><stop offset="0" stop-color="oklch(0.42 0.16 ${hue})"/><stop offset="1" stop-color="oklch(0.1 0.05 ${hue + 30})"/></radialGradient>
<radialGradient id="b" cx="${at(100)}%" cy="${at(100)}%" r="55%"><stop offset="0" stop-color="oklch(0.62 0.17 ${hue - 40})" stop-opacity="0.75"/><stop offset="1" stop-color="oklch(0.2 0.1 ${hue})" stop-opacity="0"/></radialGradient>
<radialGradient id="c" cx="34%" cy="30%" r="75%"><stop offset="0" stop-color="oklch(0.9 0.08 ${hue + 20})"/><stop offset="0.5" stop-color="oklch(0.55 0.17 ${hue})"/><stop offset="1" stop-color="oklch(0.14 0.07 ${hue})"/></radialGradient>
</defs>
<rect width="640" height="400" fill="url(#a)"/><rect width="640" height="400" fill="url(#b)"/>${stars}
<ellipse cx="${planetX}" cy="${planetY}" rx="${planetR * 1.9}" ry="${planetR * 0.42}" fill="none" stroke="oklch(0.85 0.08 ${hue})" stroke-opacity="0.4" stroke-width="1.5" transform="rotate(${-30 + at(60)} ${planetX} ${planetY})"/>
<circle cx="${planetX}" cy="${planetY}" r="${planetR}" fill="url(#c)"/>
</svg>`
  return { type: 'url', url: `data:image/svg+xml,${encodeURIComponent(svg)}` }
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
      // 항성계는 만든 순서대로 나선에 놓인다
      createdAt: new Date(Date.UTC(2024, 0, 1 + categoryIndex)).toISOString(),
    })

    seedCategory.projects.forEach((seedProject, projectIndex) => {
      const projectId = `${categoryId}-${projectIndex}`
      const timeline: TimelineEntry[] = seedProject.entries.map((entry, entryIndex) => {
        const entryId = `${projectId}-e${entryIndex}`
        const art = entry.art ? seedArt(seedCategory.hue, entryId) : undefined
        const media: MediaAsset[] = art
          ? [{ id: `${entryId}-m`, kind: 'image', name: `${entry.title}.svg`, mimeType: 'image/svg+xml', size: 0, original: art, thumbnail: art }]
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
