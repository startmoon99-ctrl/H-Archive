# H Archive 개발 지침

이 파일은 프로젝트 소유자가 정한 개발 지침이다. 모든 작업은 이 지침을 따른다.
끝의 "현재 구현 맵"은 코드 위치를 빠르게 찾기 위한 요약이다.

## 1. 프로젝트 목표

H Archive는 개인 메모, 사진, 동영상, 웹게임, 프로젝트 및 기타 창작물을 한곳에 저장하고 서로 연결할 수 있는 개인 디지털 아카이브다.

단순 파일 보관함이나 갤러리가 아니라, Obsidian처럼 기록과 창작물 사이의 관계를 탐색할 수 있는 구조를 핵심으로 한다.

현재 단계는 프로토타입이며, 완성도 높은 UI / UX와 구조 검증에 집중한다.

## 2. 핵심 콘텐츠

모든 자료를 하나의 공통된 Archive Item 개념으로 관리한다.

주요 타입: Memo, Photo, Video, Game, Project, Link

각 Item은 필요에 따라 다음 정보를 가질 수 있다.

- 제목
- 내용
- 생성일 / 수정일
- 태그
- 콘텐츠 타입
- 썸네일
- 연결된 Item
- Backlink
- 첨부 자료

콘텐츠 타입이 늘어나더라도 기존 구조를 크게 수정하지 않고 확장할 수 있어야 한다.

## 3. 메인 화면

H Archive의 메인 화면은 일반적인 통계형 Dashboard보다 Obsidian 스타일의 연결 탐색 경험을 중심으로 한다.

PC 기준 기본 구조:

- 왼쪽: Explorer / Sidebar
- 중앙: Graph View
- 오른쪽: 선택한 Item 정보 / Backlinks / 관련 항목
- 필요 시 최근 작업 및 빠른 생성 기능

Graph View에서는 Memo뿐 아니라 Photo, Video, Game, Project 등 모든 Archive Item을 노드로 표현할 수 있어야 한다.

노드를 선택하면 관련 자료와 연결 관계를 확인할 수 있고, 특정 노드를 중심으로 관련 항목만 보는 Focus Mode도 고려한다.

Graph는 단순 장식이 아니라 실제 탐색 기능이어야 한다.

## 4. 탐색 방식

사용자는 여러 방식으로 같은 자료에 접근할 수 있어야 한다.

- Explorer
- Search
- Tags
- Gallery
- Graph View
- Backlinks
- 최근 항목

파일 구조만 강제하지 않는다.

사진과 영상은 Gallery가 편하고, 메모와 프로젝트 관계는 Graph가 편한 식으로 콘텐츠 특성에 맞는 탐색 방법을 제공한다.

## 5. PC / 모바일 UX

Responsive를 기본으로 한다. PC 화면을 단순히 모바일 크기로 축소하지 않는다.

PC:

- Sidebar
- Main Content
- Graph
- Backlinks / Related Panel

모바일:

- 간결한 상단 Navigation
- Bottom Navigation
- Drawer
- Bottom Sheet
- 터치 친화적인 Graph 조작

모바일 터치 영역은 충분히 크게 만들고 한 손 조작을 고려한다.

향후 PC와 모바일은 동일한 Backend / Database / Storage를 사용하여 같은 데이터를 공유하도록 설계한다.

## 6. 조작감

H Archive는 화려한 인터랙션 사이트는 아니지만 조작감은 매우 부드러워야 한다.

다음 요소는 자연스럽게 전환한다.

- 화면 전환
- Sidebar
- Modal
- Bottom Sheet
- 카드 열기 / 닫기
- Graph 선택
- Gallery
- 검색 결과
- 메뉴 전환
- 상세 화면 진입

Fade, Slide, Scale 등을 상황에 맞게 사용하되 과도한 효과는 피한다.

애니메이션 때문에 사용자가 기다리거나 UI가 느려져서는 안 된다. 반응성과 명확한 Feedback을 우선한다.

## 7. 코드 구조

유지보수성과 확장성을 매우 중요하게 본다.

기본 원칙:

- 하드코딩 최소화
- 반복 UI 컴포넌트화
- 데이터 기반 구조
- 관심사 분리
- 재사용 가능한 코드
- 낮은 Coupling
- 명확한 책임 분리

단, 의미 없이 작은 단위까지 컴포넌트화하지 않는다.

다음 조건 중 하나에 해당하면 컴포넌트 분리를 우선한다.

- 반복 사용된다.
- 독립적으로 수정될 가능성이 높다.
- 자체 상태 또는 로직을 가진다.
- 하나의 명확한 UI 책임을 가진다.

예: Sidebar, GraphView, GraphNode, ArchiveCard, SearchBar, NoteEditor, MediaViewer, BacklinksPanel, BottomSheet, Modal

## 8. 하드코딩 방지

다음과 같은 값은 여러 컴포넌트에 직접 작성하지 않는다.

- 콘텐츠 타입
- 메뉴
- 태그 설정
- 아이콘
- 애니메이션 값
- Breakpoint
- 디자인 값
- 상태 값

가능한 경우 config, constants, data, design token 등으로 관리한다.

특정 기능을 추가할 때 여러 파일에 같은 값을 반복해서 추가해야 하는 구조를 피한다.

## 9. 데이터 접근 구조

UI 컴포넌트가 저장 방식에 직접 의존하지 않도록 한다.

```
UI → Service / Repository → Storage

프로토타입: UI → archiveService → localStorage
향후:       UI → archiveService → Supabase
```

따라서 나중에 Backend를 연결하더라도 UI 전체를 다시 작성하지 않게 한다.

## 10. 현재 프로토타입 기술 방향

현재는 정적 프로토타입으로 구현한다.

기본 기술: React, Vite, JavaScript 또는 TypeScript, Responsive CSS, localStorage, Mock Data

현재 단계에서는 Backend 구축을 우선하지 않는다.

실제 기능처럼 테스트할 필요가 있는 데이터는 localStorage에 저장하여 새로고침 후에도 유지할 수 있게 한다.

초기 샘플 콘텐츠는 별도의 Mock Data 파일로 관리한다.

## 11. 향후 확장

프로토타입 검증 후 다음 구조로 확장할 예정이다.

- Vercel
- Supabase Database
- Supabase Storage
- Authentication
- PC / 모바일 데이터 동기화
- PWA
- Offline 대응
- Sync 상태 표시

따라서 현재 구조가 이 확장을 방해하지 않도록 설계한다.

## 12. 파일 구조

기능 단위와 공통 UI를 구분한다.

예: `src/` 아래 components, features, pages, hooks, services, store, data, config, utils, styles

기능이 커지면 feature 내부에 components, hooks, services 등을 배치하는 방식도 허용한다.

폴더 구조 자체보다 어디에 어떤 코드가 있는지 예측 가능한 구조를 우선한다.

## 13. 실행 환경

Windows에서 개발자가 터미널 명령어를 매번 입력하지 않아도 되도록 BAT 파일을 제공한다.

- `H-Archive-실행.bat`: 필요한 dependency 확인 → Vite 개발 서버 실행 → 브라우저 실행
- `H-Archive-모바일테스트.bat`: Vite를 host 옵션으로 실행하여 같은 네트워크의 모바일 기기에서 접속 가능하게 한다.

BAT 파일은 프로젝트 루트에 배치한다.

## 14. 디자인 원칙

전체적으로 깔끔하고 차분한 개인 아카이브 느낌을 유지한다.

Obsidian을 참고하되 그대로 복제하지 않는다.

H Archive만의 핵심은 **텍스트뿐 아니라 사진, 영상, 게임, 프로젝트까지 서로 연결되는 개인 창작 아카이브**라는 점이다.

디자인보다 콘텐츠 탐색과 사용성을 우선한다.

## 15. 개발 진행 원칙

기능을 바로 추가하기 전에 다음 순서로 판단한다.

요구사항 → User Flow → 구조 → 컴포넌트 설계 → 구현 → Responsive 확인 → Edge Case 확인 → UX 검증

기능이 복잡도와 유지보수 비용에 비해 가치가 낮으면 추가하지 않는다.

새 기능을 구현할 때 기존 기능을 깨뜨리지 않았는지 Regression을 확인한다.

## 16. 가장 중요한 기준

H Archive는 기능이 많은 앱이 목표가 아니다.

사용자가 **빠르게 저장하고 → 쉽게 찾고 → 서로 연결하고 → 다시 꺼내볼 수 있는 것**이 가장 중요하다.

프로토타입 단계에서는 Backend나 고급 기능보다 구조 / 사용성 / 조작감 / Responsive / 확장 가능한 코드 완성도를 우선한다.

---

# 현재 구현 맵

기술: React 19 · Vite · TypeScript · zustand · react-router · d3-force · lucide-react. import 경로는 `@/` = `src/`.

명령: `npm run dev` · `npm run dev:host` · `npm run typecheck` · `npm run build`

## 값은 어디에 정의하는가 (단일 출처)

| 무엇 | 위치 |
| --- | --- |
| 콘텐츠 타입 (라벨·아이콘·색·미디어 형태·입력 필드) | `src/config/itemTypes.ts` |
| 메뉴 / 경로 | `src/config/navigation.ts` |
| Breakpoint | `src/config/breakpoints.ts` → `<html data-layout="mobile\|tablet\|desktop">` |
| 애니메이션 시간 / easing | `src/config/motion.ts` → `--motion-*`, `--ease-*` |
| 그래프 수치 (힘, 줌, 제스처, Focus 범위) | `src/config/graph.ts` |
| 색 · 간격 · 크기 · z-index | `src/styles/tokens.css` |
| 개수 제한, 저장 키, 시트 스냅 값 | `src/config/app.ts` |

타입 색상과 모션 값은 `src/styles/injectTokens.ts`가 config에서 CSS 변수로 주입한다. CSS에 같은 값을 다시 적지 않는다.

CSS의 레이아웃 분기는 media query가 아니라 `:root[data-layout='…']` 선택자로 한다. 구조 자체가 달라지는 분기는 `useLayout()`으로 한다.

## 데이터 흐름

```
컴포넌트 → store (zustand) → services/archiveService → ArchiveRepository → IndexedDB
```

- 저장소 (2026-10-12 변경, 위 9·10절의 localStorage 표기를 대체): Archive Item은 IndexedDB에, 테마 같은 소량의 설정만 localStorage에 둔다. DB 이름 · version · store 이름은 `src/config/app.ts`의 `ARCHIVE_DB`.
- `src/services/archiveRepository.ts`: 저장소 인터페이스(list / upsert / remove / replaceAll)와 오류 계열(`StorageError` → `StorageWriteError`, `StorageUnavailableError`). Supabase로 바꿀 때 새 구현체만 추가하고 `archiveService.ts` 맨 아래 한 줄을 교체한다.
- `src/services/indexedDbRepository.ts`: 현재 구현체. 첫 실행 때 예전 localStorage 데이터(`STORAGE_KEYS.legacyItems`)가 있으면 옮기고, 없으면 샘플을 넣는다. 원본 localStorage 데이터는 지우지 않는다.
- IndexedDB는 기기 · 브라우저 · 주소(origin)마다 따로다. PC와 모바일이 동기화되는 것처럼 표현하지 않는다.
- Backlink는 저장하지 않는다. `src/utils/links.ts`의 `buildLinkIndex`가 `links`(ID 기반) + 본문 WikiLink에서 계산한다.
- 샘플 데이터: `src/data/sampleItems.ts`

## WikiLink 규칙

- 문법과 해석은 `src/utils/wikilinks.ts` 한 곳에만 있다. 다른 코드는 `[[`를 직접 파싱하지 않고 `parseWikiLink` / `extractWikiLinks` / `replaceWikiLinks`와 `LinkIndex.resolveWikiLink`를 쓴다. ID 기반 링크로 바꿀 때 이 파일만 고치기 위함이다.
- 지금은 `[[제목]]`을 제목으로 해석하므로 제목은 Archive 전체에서 유일하다(`normalizeTitle` 기준: 앞뒤 공백 · 대소문자 무시).
- 중복 검사와 이름 변경 처리는 `archiveService`가 한다. 직접 적은 제목이 겹치면 `DuplicateTitleError`로 저장을 거부하고, 비워 둔 제목은 본문에서 만들어 번호를 붙인다. 제목이 바뀌면 그 Item을 가리키던 WikiLink를 모든 Item의 본문에서 새 제목으로 바꿔 한 번에 저장한다.
- UI는 검사 로직을 다시 구현하지 않는다. 편집기는 `findTitleConflict`를 호출해 미리 안내만 한다.

## 폴더

- `components/`: 여러 기능이 함께 쓰는 UI (Modal, Drawer, BottomSheet, ArchiveCard, ItemRow, TypeFilter …)
- `features/layout`: AppShell, Sidebar, TopBar, BottomNav, InspectorPanel
- `features/graph`: GraphView, GraphNode, GraphControls + 레이아웃 / 뷰포트 / 제스처 훅
- `features/item`: ItemInspector, ItemRelations(연결·백링크·관련), ContentRenderer, MediaViewer
- `features/editor`, `features/search`, `features/explorer`
- `pages/`: 라우트 단위 화면

## 배포

- GitHub `main` 브랜치에 push하면 Vercel이 자동으로 빌드 · 배포한다 (Vercel 프로젝트가 저장소에 연결되어 있다는 전제).
- `vercel.json`: 빌드 명령(`npm run build`) · 출력 폴더(`dist`) · SPA rewrite. BrowserRouter 경로(`/item/…`, `/tags/…`)를 직접 열거나 새로고침해도 `index.html`이 응답한다. 실제 파일(`/assets/*`, `/games/*`, `/favicon.svg`)은 rewrite보다 먼저 응답한다.
- 배포본의 데이터는 그 주소의 브라우저 IndexedDB에만 저장된다. 로컬 개발 주소나 다른 기기와 공유되지 않는다.
- 로컬 개발용 BAT 파일은 배포와 무관하다. `.gitattributes`가 BAT의 CRLF를 유지한다.

## 새 콘텐츠 타입 추가

`src/config/itemTypes.ts`의 `ITEM_TYPES`에 항목 하나를 추가한다. 기존에 없는 미디어 형태가 필요할 때만 `MediaKind`와 `features/item/MediaViewer.tsx`의 `MEDIA_RENDERERS`에 렌더러를 추가한다.
