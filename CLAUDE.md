# H Archive 개발 지침

H Archive는 **내가 만들어온 창작물과 그 과정의 기억으로 이루어진 개인 은하**다.
파일 저장소나 포트폴리오가 아니라, 혼자 들어와 과거의 창작과 당시의 생각을 다시 꺼내 보는 공간이다.

이 파일은 여러 AI 도구가 이어서 작업할 때의 기준이다. 앞부분은 지켜야 할 원칙, 뒷부분은 코드 위치를 찾는 지도다.

## 가장 중요한 기준

기능을 더하기 전에 묻는다: **이 기능이 과거에 만든 것을 다시 보고 그때의 기억을 떠올리는 경험을 더 좋게 만드는가?** 아니라면 추가하지 않는다.

만들지 않는 것: SNS · 댓글 · 좋아요 · 팔로우 · 커뮤니티 · 결제 · 협업 · 관리자 대시보드 · 게임 실행 플랫폼 · 통계 시스템.

## 세계관

| 개념 | 화면 | 데이터 |
| --- | --- | --- |
| 은하 | 첫 화면 전체 | Archive 전체 |
| 항성계 | 별 하나와 그 궤도 | 카테고리 (`Category`) |
| 행성 | 궤도를 도는 천체 | 프로젝트 (`Project`) |
| 위성 | 행성 주위의 작은 점 | 개발 기록 (`TimelineEntry`) |

카테고리와 프로젝트는 데이터다. 코드에 고정하지 않는다. 위치도 저장하지 않고 만든 순서로 계산하므로 은하는 스스로 자란다.

## 원칙

- **톤**: 어둡고 조용한 우주의 기억 저장소. Black · Deep Navy · Violet · Blue. HUD 범벅, 형광 네온, 대시보드, 과한 Glassmorphism, 전형적인 AI 서비스 디자인은 피한다.
- **애니메이션은 핵심 경험이다.** 평소에는 느리고 신비롭게, 선택과 전환의 순간에는 강하게. 단순 Fade만 반복하지 않는다. 그래도 사용자를 기다리게 하지 않는다.
- **하드코딩 금지.** 색 · 간격 · 시간 · 배치 수치 · 종류 목록은 아래 "값은 어디에 정의하는가"의 한 곳에만 둔다. 컴포넌트에 `duration: 0.73` 같은 값을 직접 쓰지 않는다.
- **4K 기준.** 캔버스는 기기 해상도 그대로(4K까지) 그리고, 크게 보이는 이미지는 고해상도 파일을 쓰며, 넓은 화면에서 UI가 함께 커진다. 크기는 px가 아니라 rem · 토큰으로 쓴다.
- **모바일은 축소판이 아니다.** Hover에 의존하는 필수 기능을 만들지 않는다. 터치 영역은 44px 이상.
- **성능.** 원본 영상은 직접 열 때만 불러온다. 보이지 않는 Preview는 재생하지 않는다. rAF 루프를 새로 만들지 않는다(`motion/ticker.ts` 하나를 쓴다).
- **구조.** 거대한 컴포넌트를 만들지 않는다. 새 기능 전에 기존 컴포넌트를 재사용 · 확장할 수 있는지 먼저 본다. 쓰지 않는 코드는 지운다.
- 진행 순서: 요구사항 → User Flow → 구조 → 구현 → Responsive 확인 → Edge Case → 기존 기능 Regression 확인.

---

# 구현 지도

기술: React 19 · Vite · TypeScript · zustand · react-router · lucide-react. import 경로는 `@/` = `src/`.
은하는 **Canvas(별 · 성운 · 먼지) + DOM(항성계 · 행성)** 의 2.5D다. 3D 엔진과 애니메이션 라이브러리는 쓰지 않는다.

명령: `npm run dev` · `npm run dev:host` · `npm run typecheck` · `npm run build`
Windows: `H-Archive-Start.bat`(실행) · `H-Archive-Mobile.bat`(같은 Wi-Fi의 휴대폰에서 접속)
개발 서버는 항상 `http://localhost:5183`이다(`vite.config.ts`의 `strictPort`). 기록이 주소마다 따로 저장되므로 포트를 바꾸지 않는다.

## 값은 어디에 정의하는가 (단일 출처)

| 무엇 | 위치 |
| --- | --- |
| 색 · 글자 · 간격 · 크기 · z-index · 화면 배율 | `src/styles/tokens.css` |
| 모션 시간 · easing · 프리셋 · 설정 항목 | `src/config/motion.ts` |
| 은하 배치 · 카메라 · 별 배경 수치 | `src/config/galaxy.ts` |
| 미디어 종류 · 썸네일 / 고해상도 / Preview 생성 규칙 | `src/config/media.ts` |
| 항성 색 목록 · 프로젝트 상태 | `src/config/catalog.ts` |
| 인트로 순서와 시간 | `src/config/intro.ts` |
| Breakpoint · 고정 UI 높이 | `src/config/layout.ts` |
| 화면에 떠 있는 버튼 목록 | `src/config/hud.ts` |
| 경로 | `src/config/routes.ts` |
| 저장 키 · DB 이름 · 개수 제한 | `src/config/app.ts` |

- 레이아웃 분기: CSS는 media query 대신 `:root[data-layout='mobile|tablet|desktop']`, `:root[data-ui='touch|pointer']` 선택자를 쓴다. 구조 자체가 달라지는 분기는 `useViewport()`의 `touchUi`로 한다.
- 화면 배율: 1920px보다 넓으면 root 글자 크기가 커진다(`--root-font-size`). JS에서 px로 계산하는 값에는 `useViewport().scale`을 곱한다.
- 은하 안(world 좌표)의 CSS(`galaxy.css` · `star-system.css` · `planet.css`)는 px가 world unit이다. 화면에서 크기가 일정해야 하는 것은 `--focus-zoom` · `--overview-zoom` · `--view-zoom`으로 나눈다.

## 모션 시스템

```
config/motion.ts ─ motionStore(설정 · 저장 · 시스템 '동작 줄이기') ─ motion/runtime.ts
                                                                   ├─ CSS 변수 (--dur-*, --ease-*, --reveal-*, --m-*)
                                                                   └─ getMotion() / motionMs()  ← rAF 루프 · 타이머
```

- CSS는 변수만 쓰고, JS는 `getMotion()` · `motionMs()`만 쓴다. Motion Settings와 실제 애니메이션이 같은 값을 공유한다.
- 재사용 부품: `Reveal`(스크롤 등장) · `.enter`(놓일 때 등장) · `useMagnetic` · `useTilt` · `CursorGlow` · `useScrollLinked`(스크롤 연동) · `usePresence`(닫히는 애니메이션).
- 설정 항목을 늘릴 때: `MotionSettings` 타입 → 프리셋 값 → `motionControls`. 설정 화면은 고치지 않는다.

## 데이터 흐름

```
컴포넌트 → store(zustand) → services/archiveService → services/storage(인터페이스) → IndexedDB
```

- `services/storage/types.ts`: `ArchiveRepository`(메타데이터 · 타임라인) · `MediaStorage`(파일). 원격 DB / Object Storage로 옮길 때는 구현체를 추가하고 `services/storage/index.ts` 두 줄만 바꾼다. `MediaStorage.put`은 진행률과 중단 신호를 받으므로 대용량 resumable 업로드를 그대로 얹을 수 있다.
- 지금 구현체는 이 브라우저의 IndexedDB다. **기기 · 브라우저 · 주소마다 따로** 저장된다. 동기화되는 것처럼 표현하지 않는다.
- 미디어 한 건(`MediaAsset`)은 최대 네 파일이다: `thumbnail`(은하 · 카드) · `display`(상세 · 갤러리, 최대 2560px) · `preview`(짧은 무음 영상) · `original`(손대지 않은 원본, 크게 볼 때만).
- 영상 Preview는 저장 뒤 백그라운드에서 만든다(`previewPending`). 중간에 닫아도 다음 실행 때 이어서 만든다.
- 첫 실행 때만 `src/data/seed.ts`의 샘플 은하가 들어간다. 설정 → Data에서 한 번에 비울 수 있다.

## 화면 구조

주소가 화면 상태의 단일 출처다: `/`(은하) · `/system/:categoryId` · `/project/:projectId`. `useArchiveRoute()`로 읽는다.

`app/App.tsx`의 층(아래 → 위): `Galaxy` → `ProjectLayer` → `Hud` → `UploadDropzone` → `DialogHost` → `Toaster` → `Intro` → `CursorGlow`

- 은하는 항상 떠 있고, 카메라의 목표만 주소에 따라 바뀐다. 프로젝트 화면은 눌렀던 행성 자리에서 원으로 열린다.
- 대화상자는 한 번에 하나다. `uiStore.openDialog({ type })` → `features/dialogs/DialogHost.tsx`가 내용을 고른다.
- "추가"의 뜻은 위치에 따라 다르다(`app/useAddAction.ts`): 프로젝트 안에서는 새 기록, 그 밖에서는 새 창작물. + 버튼과 Drag & Drop이 함께 쓴다.

## 폴더

- `app/`: 조립과 전역 훅(경로 · 단축키 · 추가 동작)
- `components/`: 여러 기능이 함께 쓰는 UI (`Button` · `Dialog` · `Toaster` · `form/*`)
- `motion/`: 모션 런타임과 재사용 부품
- `features/galaxy`: `Galaxy` · `Starfield`(+`starScene`) · `StarSystem` · `ProjectObject` · `ProjectCard` · `ProjectRail`(모바일) · `SystemTitle` · `layout.ts`(배치 계산) · `useGalaxyCamera`
- `features/project`: `ProjectLayer` · `ProjectHero` · `Timeline` · `TimelineEntryCard`
- `features/media`: `MediaPreview` · `MediaGallery` · `MediaViewer` · `useMediaUrl`
- `features/editor`: `ProjectForm` · `EntryForm` · `CategoryForm` · `FormShell`
- `features/upload`: `UploadDropzone` · `FileStaging`
- `features/intro` · `features/hud` · `features/search` · `features/settings` · `features/dialogs`

## 자주 하는 변경

- **미디어 종류 추가**: `config/media.ts`의 `MEDIA_KINDS`에 한 항목. 새 표시 방식이 필요할 때만 `MediaViewer.tsx`의 `VIEWERS`, 썸네일을 만들 수 있으면 `archiveService.ts`의 `DESCRIBERS`.
- **프로젝트 상태 · 항성 색 추가**: `config/catalog.ts`.
- **화면에 떠 있는 버튼 추가**: `config/hud.ts` + `Hud.tsx`의 `run`.
- **은하의 간격 · 궤도 · 카메라 느낌 조절**: `config/galaxy.ts`만 고친다.

## 배포

- `vercel.json`: 빌드(`npm run build`) · 출력(`dist`) · SPA rewrite. `/system/…` · `/project/…`를 직접 열어도 `index.html`이 응답한다.
- GitHub `main`에 push하면 Vercel이 자동으로 빌드 · 배포한다. 배포본의 기록은 그 주소의 브라우저에만 저장되며 로컬 개발 주소와 공유되지 않는다.
- push 전에 파일 이름의 대소문자를 확인한다. Windows는 구분하지 않지만 Vercel(Linux)은 구분하므로 import 경로와 다르면 빌드가 깨진다.

## 검증할 때

- Vite가 같은 파일의 연속 수정 중 뒤의 것을 놓칠 때가 있다(`… is not defined`). 디스크의 코드가 `npm run typecheck`를 통과하면 개발 서버를 재시작한다.
- 가려진 탭에서는 rAF와 CSS 애니메이션이 멈춘다. 화면 확인은 탭을 앞에 둔 상태에서 한다.
