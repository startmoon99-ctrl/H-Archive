import type { ArchiveItem } from '@/types/archive';

const DAY = 86_400_000;

type SampleSeed = Omit<ArchiveItem, 'createdAt' | 'updatedAt' | 'tags' | 'links'> & {
  tags?: string[];
  links?: string[];
  createdDaysAgo: number;
  updatedDaysAgo: number;
};

/** 네트워크가 없으면 CoverImage가 생성형 커버로 대체한다 */
const photo = (seed: string) => `https://picsum.photos/seed/${seed}/960/720`;

const SEEDS: SampleSeed[] = [
  {
    id: 'p-harchive',
    type: 'project',
    title: 'H Archive',
    content:
      '# 개요\n메모, 사진, 영상, 게임, 프로젝트를 한곳에 모으고 서로 연결하는 개인 창작 아카이브.\n\n## 지금 단계\n- 프로토타입: 구조와 조작감 검증\n- 저장은 이 기기의 IndexedDB (기기 간 동기화 없음), 이후 Supabase로 교체\n\n## 다음\n- [[PWA 전환 계획]] 정리하기\n- 실제 사진 업로드 흐름 다듬기',
    tags: ['프로젝트', '아카이브', '진행중'],
    links: ['m-vision', 'm-graph-idea', 'm-mobile-ux', 'm-data-model', 'ph-sketch', 'l-obsidian', 'l-vite'],
    createdDaysAgo: 40,
    updatedDaysAgo: 0.08,
  },
  {
    id: 'm-vision',
    type: 'memo',
    title: 'H Archive 방향 메모',
    content:
      '기능이 많은 앱이 목표가 아니다.\n\n**빠르게 저장하고 → 쉽게 찾고 → 서로 연결하고 → 다시 꺼내볼 수 있는 것.**\n\n파일 보관함이 아니라 관계를 탐색하는 도구여야 한다. 텍스트뿐 아니라 사진, 영상, 게임까지 같은 그래프 위에 올라가는 것이 핵심.',
    tags: ['아카이브', '기획'],
    createdDaysAgo: 39,
    updatedDaysAgo: 6,
  },
  {
    id: 'm-graph-idea',
    type: 'memo',
    title: '그래프 뷰 아이디어',
    content:
      '그래프는 장식이 아니라 실제 탐색 기능이어야 한다.\n\n- 노드 색으로 콘텐츠 타입 구분\n- 선택하면 연결된 항목과 백링크를 바로 확인\n- Focus Mode: 선택한 노드 주변만 보기\n- 모바일에서는 핀치 줌과 넉넉한 터치 영역\n\n참고: [[d3-force 문서]], [[Obsidian]]',
    tags: ['아카이브', '그래프', 'UX'],
    createdDaysAgo: 30,
    updatedDaysAgo: 2,
  },
  {
    id: 'm-mobile-ux',
    type: 'memo',
    title: '모바일 UX 메모',
    content:
      'PC 화면을 그대로 줄이지 않는다.\n\n- 하단 내비게이션 + 가운데 생성 버튼\n- 선택한 노드 정보는 Bottom Sheet\n- 탐색기는 Drawer\n- 한 손 조작 기준으로 터치 영역 44px 이상',
    tags: ['아카이브', 'UX', '모바일'],
    links: ['m-graph-idea'],
    createdDaysAgo: 22,
    updatedDaysAgo: 4,
  },
  {
    id: 'm-data-model',
    type: 'memo',
    title: '데이터 구조 메모',
    content:
      '모든 자료는 하나의 Archive Item.\n\n- 타입은 레지스트리에서 정의\n- 연결은 `links` + 본문의 위키링크\n- 제목은 겹칠 수 없고, 바꾸면 위키링크도 따라 바뀜\n- 백링크는 저장하지 않고 계산\n- UI → archiveService → Storage 순서로만 접근\n\n배경은 [[H Archive 방향 메모]] 참고.',
    tags: ['아카이브', '설계'],
    createdDaysAgo: 28,
    updatedDaysAgo: 9,
  },
  {
    id: 'ph-sketch',
    type: 'photo',
    title: 'UI 스케치',
    content: '노트에 그려 본 첫 레이아웃. 왼쪽 탐색기, 가운데 그래프, 오른쪽 정보 패널.',
    tags: ['아카이브', '스케치'],
    thumbnail: photo('harchive-sketch'),
    createdDaysAgo: 35,
    updatedDaysAgo: 35,
  },
  {
    id: 'ph-desk',
    type: 'photo',
    title: '작업 책상',
    content: '주말 작업 풍경.',
    tags: ['일상'],
    links: ['p-harchive'],
    thumbnail: photo('harchive-desk'),
    createdDaysAgo: 12,
    updatedDaysAgo: 12,
  },
  {
    id: 'l-obsidian',
    type: 'link',
    title: 'Obsidian',
    content: '연결 중심 노트 앱. 그래프 뷰와 백링크 경험의 참고 대상. 그대로 복제하지는 않는다.',
    tags: ['참고'],
    url: 'https://obsidian.md',
    createdDaysAgo: 38,
    updatedDaysAgo: 38,
  },
  {
    id: 'l-d3force',
    type: 'link',
    title: 'd3-force 문서',
    content: '그래프 레이아웃에 쓰는 force simulation 문서.',
    tags: ['참고', '그래프'],
    url: 'https://d3js.org/d3-force',
    createdDaysAgo: 29,
    updatedDaysAgo: 29,
  },
  {
    id: 'l-vite',
    type: 'link',
    title: 'Vite 문서',
    content: '개발 서버와 빌드 도구.',
    tags: ['참고'],
    url: 'https://vite.dev',
    createdDaysAgo: 37,
    updatedDaysAgo: 37,
  },
  {
    id: 'p-starcatcher',
    type: 'project',
    title: '별 줍기 게임 만들기',
    content:
      '# 목표\n주말 동안 끝낼 수 있는 아주 작은 웹게임.\n\n## 진행\n- 캔버스 기본 루프\n- 터치 / 마우스 조작\n- 점수 표시\n\n결과물은 [[별 줍기]] 에서 바로 플레이할 수 있다.',
    tags: ['프로젝트', '게임개발', '완료'],
    links: ['g-starcatcher', 'm-game-design', 'v-devlog'],
    createdDaysAgo: 20,
    updatedDaysAgo: 3,
  },
  {
    id: 'g-starcatcher',
    type: 'game',
    title: '별 줍기',
    content: '떨어지는 별을 바구니로 받는 간단한 게임.\n\n- 마우스 / 터치로 좌우 이동\n- 별을 놓치면 목숨이 줄어든다',
    tags: ['게임개발', '웹게임'],
    url: '/games/star-catcher/index.html',
    createdDaysAgo: 14,
    updatedDaysAgo: 3,
  },
  {
    id: 'm-game-design',
    type: 'memo',
    title: '게임 디자인 노트',
    content:
      '작은 게임일수록 첫 3초가 중요하다.\n\n- 설명 없이 바로 조작 가능해야 함\n- 실패해도 다시 시작이 빠를 것\n- 점수 피드백은 즉각적으로',
    tags: ['게임개발', 'UX'],
    links: ['g-starcatcher'],
    createdDaysAgo: 19,
    updatedDaysAgo: 15,
  },
  {
    id: 'v-devlog',
    type: 'video',
    title: '개발 로그 #1',
    content: '별 줍기 게임을 만들면서 녹화한 짧은 클립. (샘플 영상)',
    tags: ['게임개발', '기록'],
    links: ['ph-desk'],
    url: 'https://www.w3schools.com/html/mov_bbb.mp4',
    createdDaysAgo: 13,
    updatedDaysAgo: 13,
  },
  {
    id: 'p-jeju',
    type: 'project',
    title: '제주 여행 기록',
    content: '# 3박 4일 제주\n사진과 영상, 일정 메모를 한데 묶어 두는 기록 프로젝트.\n\n일정은 [[제주 여행 일정]] 에 정리.',
    tags: ['여행', '제주', '프로젝트'],
    links: ['ph-jeju-sunrise', 'ph-jeju-beach', 'ph-jeju-oreum', 'v-jeju'],
    createdDaysAgo: 60,
    updatedDaysAgo: 8,
  },
  {
    id: 'm-jeju-plan',
    type: 'memo',
    title: '제주 여행 일정',
    content: '- 1일차: 도착, 협재 해변\n- 2일차: 성산 일출봉 새벽 산행\n- 3일차: 오름 산책, 카페\n- 4일차: 시장 들르고 복귀',
    tags: ['여행', '제주'],
    createdDaysAgo: 66,
    updatedDaysAgo: 61,
  },
  {
    id: 'ph-jeju-sunrise',
    type: 'photo',
    title: '성산 일출',
    content: '새벽 다섯 시에 올라가서 본 해돋이.',
    tags: ['여행', '제주', '풍경'],
    thumbnail: photo('harchive-sunrise'),
    createdDaysAgo: 58,
    updatedDaysAgo: 58,
  },
  {
    id: 'ph-jeju-beach',
    type: 'photo',
    title: '협재 해변',
    content: '물빛이 정말 맑았던 오후.',
    tags: ['여행', '제주', '풍경'],
    thumbnail: photo('harchive-beach'),
    createdDaysAgo: 59,
    updatedDaysAgo: 59,
  },
  {
    id: 'ph-jeju-oreum',
    type: 'photo',
    title: '오름 산책',
    content: '바람이 많이 불던 능선.',
    tags: ['여행', '제주'],
    thumbnail: photo('harchive-oreum'),
    createdDaysAgo: 57,
    updatedDaysAgo: 57,
  },
  {
    id: 'v-jeju',
    type: 'video',
    title: '제주 브이로그',
    content: '여행 중 찍은 클립을 이어 붙인 영상. (샘플 영상)',
    tags: ['여행', '제주', '기록'],
    links: ['ph-jeju-sunrise'],
    url: 'https://www.w3schools.com/html/movie.mp4',
    createdDaysAgo: 50,
    updatedDaysAgo: 50,
  },
  {
    id: 'm-reading',
    type: 'memo',
    title: '읽은 것: 세컨드 브레인',
    content:
      '기록은 모으는 것보다 다시 꺼내 쓰는 것이 중요하다.\n\n- 수집 → 정리 → 추출 → 표현\n- 정리 기준은 주제가 아니라 쓰임새\n\n[[H Archive 방향 메모]] 와 같은 맥락.',
    tags: ['독서', '기록'],
    links: ['l-obsidian'],
    createdDaysAgo: 18,
    updatedDaysAgo: 1.2,
  },
  {
    id: 'm-weekly',
    type: 'memo',
    title: '주간 회고',
    content:
      '## 이번 주\n- [[H Archive]] 그래프 화면 프로토타입\n- [[별 줍기 게임 만들기]] 마무리\n- 책 한 권 정리: [[읽은 것: 세컨드 브레인]]\n\n## 다음 주\n- 모바일 조작감 다듬기',
    tags: ['회고', '기록'],
    createdDaysAgo: 5,
    updatedDaysAgo: 0.6,
  },
  {
    id: 'm-ideas',
    type: 'memo',
    title: '다음에 만들 것들',
    content: '- 리듬에 맞춰 누르는 미니 게임\n- 사진으로 만드는 월간 회고 페이지\n- 아카이브 공유용 읽기 전용 링크',
    tags: ['아이디어'],
    links: ['p-starcatcher', 'p-harchive'],
    createdDaysAgo: 9,
    updatedDaysAgo: 5,
  },
  {
    id: 'm-doodle',
    type: 'memo',
    title: '오래된 낙서',
    content: '아직 어디에도 연결되지 않은 메모. 그래프에서는 혼자 떠 있는 노드로 보인다.',
    tags: ['일상'],
    createdDaysAgo: 90,
    updatedDaysAgo: 90,
  },
];

export function createSampleItems(now = Date.now()): ArchiveItem[] {
  return SEEDS.map(({ createdDaysAgo, updatedDaysAgo, tags = [], links = [], ...rest }) => ({
    ...rest,
    tags,
    links,
    createdAt: new Date(now - createdDaysAgo * DAY).toISOString(),
    updatedAt: new Date(now - updatedDaysAgo * DAY).toISOString(),
  }));
}
