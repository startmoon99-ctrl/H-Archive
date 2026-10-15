# H Archive 개발 지침

H Archive는 **내가 만들어온 창작물과 그 과정의 기억이 떠 있는 개인 공간**이다.
파일 저장소나 포트폴리오가 아니라, 혼자 들어와 과거의 창작과 당시의 생각을 다시 꺼내 보는 곳이다.
목표는 사이트를 "보는" 것이 아니라 **"H Archive라는 공간 안으로 들어왔다"**고 느끼게 하는 것이다.

이 파일은 여러 AI 도구가 이어서 작업할 때의 기준이다. 앞부분은 지켜야 할 원칙, 뒷부분은 코드 위치를 찾는 지도다.

## 가장 중요한 기준

기능을 더하기 전에 묻는다: **이 기능이 과거에 만든 것을 다시 보고 그때의 기억을 떠올리는 경험을 더 좋게 만드는가?** 아니라면 추가하지 않는다. 애매한 기능을 여럿 넣기보다 하나의 공간 경험을 높은 완성도로 만든다.

만들지 않는 것: SNS · 댓글 · 좋아요 · 팔로우 · 커뮤니티 · 결제 · 협업 · 관리자 대시보드 · 게임 실행 플랫폼 · 통계 시스템.

## 테마: VOID / SPACE

어둡고 깊은 무한 공간에 창작물이 떠 있다. 키워드는 미니멀 · 세련됨 · 신비로움 · 미래적 · 고급스러움 · 공간감 · 깊이감.

| 개념 | 화면 | 데이터 |
| --- | --- | --- |
| 공간 | 첫 화면 전체 | Archive 전체 |
| 성단 | 빛의 중심점과 그 주변의 입자 무리 | 카테고리 (`Category`) |
| 작품 | 멀리서는 빛나는 점, 가까이서는 얇은 프레임 | 프로젝트 (`Project`) |
| 기록 | 프로젝트 상세의 타임라인 | 개발 기록 (`TimelineEntry`) |

- **직설적인 우주 그림을 쓰지 않는다.** 행성 · 궤도 · 알록달록한 성운 · 별자리는 소유자가 "못생겼다"고 명확히 거부했다(2026-10-12). 추상적인 빛 · 점 · 가는 선 · 깊이로 표현한다.
- 색은 거의 무채색의 차가운 빛 하나로 통일한다. 성단의 고유색은 아주 옅게만 묻힌다(`--chroma-tint`). 과도한 네온, 흔한 사이버펑크 UI, 게임 HUD, 대시보드, 전형적인 AI 서비스 디자인은 피한다.
- 카테고리와 프로젝트는 데이터다. 코드에 고정하지 않는다. 위치는 만든 순서로 계산하므로 공간은 스스로 자란다. 예외: 소유자가 설정 → Space → 성단 위치 조절로 직접 옮긴 성단만 그 자리를 이 브라우저(localStorage, `store/placementStore`)에 기억한다. 기록(IndexedDB)에는 넣지 않는다.

## 인터랙션 원칙

부드러움이 최우선이다. 어떤 것도 갑자기 위치가 바뀌거나 딱딱하게 반응하지 않는다.

- 입력을 그대로 따라붙지 않는다. 약간의 **관성과 지연**(easing · damping · inertia)을 거쳐 따라온다. 과장하지 않는다.
- **Interaction과 Effect를 분리한다.** 입력은 상태값(`data-*`, `--near`, `--s`)까지만 만들고, 그 값을 받아 어떻게 빛나고 커질지는 `effects/*.css`와 셰이더가 정한다. "Hover 방식은 두고 빛만 제거" 같은 수정이 한 곳에서 끝나야 한다.
- 자주 바꾸는 값(카메라 · 시차 · 줌 · 입자 · 빛 · 전환 시간 · 감도)은 코드에 직접 쓰지 않고 config에 둔다.
- 모바일은 축소판이 아니다. Hover에 의존하는 필수 기능을 만들지 않는다. 터치 영역은 44px 이상.
- 판단 기준(우선순위): 첫 진입의 인상 → 로고 연출 → 깊이감 → 마우스를 움직였을 때의 감각 → 카메라 움직임 → 작품에 다가갈 때의 반응 → 모든 애니메이션의 부드러움 → 과밀하지 않은가 → 4K에서의 몰입감 → 모바일 터치 감각.

## 그 밖의 원칙

- **4K 기준, 하지만 강제하지 않는다.** 디자인은 4K에서 자연스러워야 하고(크기는 rem · 토큰), 렌더 해상도와 입자 수는 기기 성능에 맞춰 자동으로 조절한다(`effects/quality.ts`).
- **성능.** 원본 영상은 직접 열 때만 불러온다. 보이지 않는 Preview는 재생하지 않는다. rAF 루프를 새로 만들지 않는다(`motion/ticker.ts` 하나를 쓴다).
- **구조.** 거대한 컴포넌트를 만들지 않는다. 새 기능 전에 기존 것을 재사용 · 확장할 수 있는지 먼저 본다. 쓰지 않는 코드는 지운다.
- 진행 순서: 요구사항 → User Flow → 구조 → 구현 → Responsive 확인 → Edge Case → 기존 기능 Regression 확인.

---

# 구현 지도

기술: React 19 · Vite · TypeScript · zustand · react-router · lucide-react. import 경로는 `@/` = `src/`.
공간은 **WebGL2(입자 · 선) + DOM(성단 · 작품)** 이 하나의 원근 카메라를 공유하는 구조다. 3D 엔진과 애니메이션 라이브러리는 쓰지 않는다. 이미지 · 글자 · 영상은 DOM이라 어떤 해상도에서도 선명하고 키보드 · 터치로 접근할 수 있다.

명령: `npm run dev` · `npm run dev:host` · `npm run typecheck` · `npm run lint`(oxlint) · `npm run test`(vitest, 순수 로직만) · `npm run build`
Windows: `H-Archive-Start.bat`(실행) · `H-Archive-Mobile.bat`(같은 Wi-Fi의 휴대폰에서 접속)
개발 서버는 항상 `http://localhost:5183`이다(`vite.config.ts`의 `strictPort`). 기록이 주소마다 따로 저장되므로 포트를 바꾸지 않는다.

## 값은 어디에 정의하는가 (단일 출처)

| 무엇 | 위치 |
| --- | --- |
| 색 · 글자 · 간격 · 크기 · z-index · 화면 배율 | `src/styles/tokens.css` |
| 공간: 배치 · 카메라 · 조작 감도 · 입자 · 효과 · 품질 단계 | `src/config/space.ts` |
| 모션 시간 · easing · 프리셋 · 설정 항목 | `src/config/motion.ts` |
| 미디어 종류 · 썸네일 / 고해상도 / Preview 생성 규칙 | `src/config/media.ts` |
| 성단 색 목록 · 프로젝트 상태 | `src/config/catalog.ts` |
| 인트로 순서와 시간 | `src/config/intro.ts` |
| Breakpoint · 고정 UI 높이 | `src/config/layout.ts` |
| 화면에 떠 있는 버튼 목록 | `src/config/hud.ts` |
| 경로 | `src/config/routes.ts` |
| 저장 키 · DB 이름 · 원격 저장소 규칙 · 개수 제한 | `src/config/app.ts` |

- 레이아웃 분기: CSS는 media query 대신 `:root[data-layout='mobile|tablet|desktop']`, `:root[data-ui='touch|pointer']` 선택자를 쓴다. 구조 자체가 달라지는 분기는 `useViewport()`의 `touchUi`로 한다.
- 화면 배율: 1920px보다 넓으면 root 글자 크기가 커진다(`--root-font-size`). JS에서 px로 계산하는 값에는 `useViewport().scale`을 곱한다.
- 색은 `rgb(var(--light-rgb) / 투명도)` · `oklch(L var(--chroma-tint) var(--hue))` 형태로 토큰을 거쳐 쓴다. 컴포넌트 CSS에 색 값을 직접 적지 않는다.

## 공간 장면 (`src/features/space`)

각 폴더는 독립적으로 교체할 수 있다. 서로는 아래 화살표의 값으로만 이어진다.

```
interaction(입력) ─▶ camera(어디를 보는가) ─▶ scene(배치 → DOM 위치와 상태값) ─▶ effects(빛 · 반응)
        주소(목표) ─▶                    └─▶ environment(입자 · 선, WebGL)
```

| 폴더 | 책임 | 교체하면 바뀌는 것 |
| --- | --- | --- |
| `camera/` | `cameraRig`(감쇠 · 이동 · 관성 · 시차) · `cameraView`(상태와 원근 투영) | 카메라의 움직임 성격 |
| `interaction/` | `pointerControls`(마우스) · `touchControls`(터치) · `drag`(공통) | 조작 방식 |
| `scene/` | `layout`(데이터 → 3D 위치) · `arrangement`(옮겨 가는 성단의 지금 자리) · `sceneUpdater`(매 프레임 DOM 위치 · `--s` · `--near`) | 배치 규칙 |
| `environment/` | `particleField`(입자 배치) · `shaders` · `glRenderer` · `meteors`(별똥별) · `environment`(조립) | 배경과 입자 |
| `effects/` | `cluster-effects.css` · `node-effects.css` · `PostEffects`(비네트 · 입자감) · `quality`(품질 조절) | 빛 · Hover 반응 · 화면 효과 |
| `nodes/` | `ClusterNode` · `WorkNode`(구조와 누르는 영역만) | 성단 · 작품의 형태 |
| `ui/` | `ClusterTitle` · `ProjectRail`(모바일) · `ProjectCard` · `SpaceSummary` | 장면 위의 글과 카드 |
| `Space.tsx` | 위 모듈을 연결만 한다 | — |

- 원근 식은 `cameraView.project()`와 `shaders.ts`의 `toScreen()` 두 곳에 있고 **같아야 한다**. 다르면 DOM의 작품과 WebGL의 입자가 어긋난다.
- 한 프레임의 순서: `rig.update` → `sceneUpdater.update` → `environment.draw` (`Space.tsx`의 `onTick` 하나).
- 장면이 DOM에 쓰는 값: `transform`(화면 위치) · `--s`(world → px 배율) · `--near`(커서와의 가까움 0~1) · `--fade` · `z-index`(깊이). 성단에는 `--sense`(멀리서 알아차린 정도) · `--lean-x` · `--lean-y`(커서 쪽으로 기우는 px) · `--breath`(느린 숨 -1~1)도 쓴다. 시각 효과는 이 값과 `data-state` · `data-active` · `data-away`만 읽는다.
- 성단의 숨과 커서 인식은 DOM(중심의 빛 · 이름표)과 WebGL(입자 무리)이 같은 값으로 함께 움직인다. `sceneUpdater.ts`의 `breathOf()`와 거리 기준(반지름의 절반)은 `shaders.ts`의 식과 **같아야 한다**.

## 모션 시스템

```
config/motion.ts ─ motionStore(설정 · 저장 · 시스템 '동작 줄이기') ─ motion/runtime.ts
                                                                   ├─ CSS 변수 (--dur-*, --ease-*, --reveal-*, --m-*)
                                                                   └─ getMotion() / motionMs()  ← rAF 루프 · 타이머 · 셰이더
```

- CSS는 변수만 쓰고, JS는 `getMotion()` · `motionMs()`만 쓴다. Motion Settings와 실제 애니메이션이 같은 값을 공유한다.
- 재사용 부품: `Reveal`(스크롤 등장) · `.enter`(놓일 때 등장) · `useMagnetic` · `useTilt` · `CursorGlow` · `useScrollLinked`(스크롤 연동) · `usePresence`(닫히는 애니메이션).
- 설정 항목을 늘릴 때: `MotionSettings` 타입 → 프리셋 값 → `motionControls`. 설정 화면은 고치지 않는다.

## 데이터 흐름

```
컴포넌트 → store(zustand) → services/archiveService → services/storage(인터페이스) → IndexedDB 또는 Supabase
```

- `services/storage/types.ts`: `ArchiveRepository`(메타데이터 · 타임라인) · `MediaStorage`(파일). 구현체는 둘이고 `services/storage/index.ts`가 고른다.
  - `local/`: 이 브라우저의 IndexedDB. **기기 · 브라우저 · 주소마다 따로** 저장된다. 로그인이 없다. **지금 쓰는 것.**
  - `supabase/`: Supabase Database + Storage. 환경 변수 `VITE_SUPABASE_URL` · `VITE_SUPABASE_PUBLISHABLE_KEY`가 모두 있을 때 쓴다. 로그인해야 기록을 불러온다(`features/auth/SignInGate` · `store/sessionStore`). **연결은 보류 중이며 실제 저장 · 업로드는 아직 검증되지 않았다.**
- Supabase 쪽 준비는 `supabase/schema.sql`에 있다(테이블 · 본인 행만 접근하는 규칙 · 비공개 `media` 버킷). 이름과 업로드 규칙은 `config/app.ts`의 `REMOTE`.
- service_role(secret) 키는 코드 · 환경 변수 · 문서 어디에도 넣지 않는다. 계정은 앱에서 만들지 않고 대시보드에서 만든다.
- 어느 저장소를 쓰는지 화면에 정확히 말한다. 브라우저 저장을 동기화되는 것처럼 표현하지 않는다.
- 미디어 한 건(`MediaAsset`)은 최대 네 파일이다: `thumbnail`(공간 · 카드) · `display`(상세 · 갤러리, 최대 2560px) · `preview`(짧은 무음 영상) · `original`(손대지 않은 원본, 크게 볼 때만).
- 영상 Preview는 저장 뒤 백그라운드에서 만든다(`previewPending`). 중간에 닫아도 다음 실행 때 이어서 만든다.
- 첫 실행 때만 `src/data/seed.ts`의 샘플 기록이 들어간다. 샘플 그림의 디자인을 바꾸면 `SEED_ART_VERSION`을 올린다(이미 저장된 샘플의 그림만 다시 그린다). 설정 → Data에서 한 번에 비울 수 있다.

## 화면 구조

주소가 화면 상태의 단일 출처다: `/`(전체 보기) · `/system/:categoryId`(성단) · `/project/:projectId`(상세). `useArchiveRoute()`로 읽는다. 주소의 `system` · 코드의 `galaxy` 같은 이름은 예전 표현이 남은 것으로, 화면의 말은 공간 · 성단 · 작품이다.

`app/App.tsx`의 층(아래 → 위): `Space` → `ProjectLayer` → `Hud` → `UploadDropzone` → `DialogHost` → `Toaster` → `SignInGate` → `Intro` → `CursorGlow`

- 공간은 항상 떠 있고, 카메라의 목표만 주소에 따라 바뀐다.
- 작품 ↔ 상세 화면: 누른 작품의 이미지가 상세 화면의 대표 이미지 자리까지 이어서 이동하고, 닫으면 작품이 지금 있는 자리로 돌아간다(`features/project/SharedCover` — 이동하는 동안만 보이는 사본). 그동안 카메라는 한발 물러난다(`camera.projectZoomFactor`). 공간과 상세 화면은 서로를 모르고 `uiStore.travelOrigin`(출발 자리 · 이미지) · `uiStore.awayProjectId`(프레임을 비운 작품) · `motion/travel.ts`(돌아갈 자리)로만 이어진다. 이어 줄 이미지가 없으면(이미지 없는 작품 · 검색 · 주소로 바로 옴) 예전처럼 프레임 자리에서 창이 열리고, 움직임 최소화에서는 투명도만 바뀐다.
- 상세 화면 뒤에서도 공간은 끊기지 않는다: 성단 · 작품(DOM)은 물러나 쉬고, 입자만 낮은 빈도로 이어 그려 옅게 비친다(`--opacity-veil` · `quality.behindFrameMs`).
- 대화상자는 한 번에 하나다. `uiStore.openDialog({ type })` → `features/dialogs/DialogHost.tsx`가 내용을 고른다.
- "추가"의 뜻은 위치에 따라 다르다(`app/useAddAction.ts`): 프로젝트 안에서는 새 기록, 그 밖에서는 새 창작물. Drag & Drop과 + 버튼의 추가 메뉴(`features/hud/AddMenu` — 이 동작 + 성단 추가)가 함께 쓴다. 상단 동작 버튼은 아이콘만 보이고 이름은 `aria-label` · 툴팁으로 남긴다.

## 그 밖의 폴더

- `app/`: 조립과 전역 훅(경로 · 단축키 · 추가 동작)
- `components/`: 여러 기능이 함께 쓰는 UI (`Button` · `Dialog` · `Toaster` · `form/*`)
- `motion/`: 모션 런타임과 재사용 부품
- `features/project`: `ProjectLayer` · `SharedCover` · `ProjectHero` · `Timeline` · `TimelineEntryCard`
- `features/media`: `MediaPreview` · `MediaGallery` · `MediaViewer` · `useMediaUrl`
- `features/editor`: `ProjectForm` · `EntryForm` · `CategoryForm` · `FormShell`
- `features/upload`: `UploadDropzone` · `FileStaging`
- `features/intro` · `features/hud` · `features/search` · `features/settings` · `features/auth` · `features/dialogs`

## 자주 하는 변경

- **공간의 느낌 조절**(간격 · 깊이 · 카메라의 무게 · 시차 · 입자의 양과 번짐): `config/space.ts`만 고친다.
- **성단 위치 조절**(설정 → Space): 입력은 `interaction/arrangeControls`(성단을 잡은 입력만 가로챔), 옮겨 가는 자리는 `scene/arrangement`, 입자 무리는 셰이더의 `uMove*`로 함께 옮긴다. 끄는 무게 · 꼬리 길이는 `config/space.ts`의 `arrange`, 들어 올린 모습은 `effects/cluster-effects.css`의 `data-held`.
- **배경 별 · 별빛 단계 · 별똥별**(설정 → Space → 별빛): 값은 `config/space.ts`의 `particles.stars`(별가루 · 반짝이는 별 · 빛살, `levels`가 생동감 단계) · `particles.meteors`. 고른 단계와 별똥별 켜짐은 `store/skyStore`(localStorage). 움직임에는 Background Motion이 곱해져 동작 줄이기에서는 멈춘다.
- **가만히 있을 때의 카메라**(설정 → Space → 카메라): 메인 화면에서 입력이 없으면 카메라가 성단을 둘러보며 떠돈다(`camera/cameraRig`의 `driftIdle`). 단계별 빠르기 · 범위와 방향을 바꾸는 주기는 `config/space.ts`의 `camera.idleOrbit`, 고른 단계는 `store/skyStore`의 `orbit`. 성단 안에서도 떠돌며(`clusterReach`로 줄임), 회전의 중심은 옮기지 않고 카메라만 비켜선다.
- **배경 파노라마**(가장 뒤 레이어): 이미지는 `public/space/`(정거원통 2:1), 경로 · 밝기 · 채도 · 정면 위치는 `config/space.ts`의 `particles.backdrop`. 카메라 방향만 따르고 이동 · 확대에는 움직이지 않는다. 터치 기기는 `srcLow`를 쓴다.
- **먼 곳의 은하 · 성운**(작은 그림들): 그림은 `public/space/`, 목록 · 방향 · 크기 · 바탕 처리는 `config/space.ts`의 `particles.farImages`(한 항목 = 그림 하나). 파노라마처럼 하늘에 붙어 방향만 따른다(`environment/farImage.ts`, 셰이더 `FAR_*`).
- **빛 · Hover 반응만 바꾸기**: `features/space/effects/*.css`. 동작은 그대로 남는다.
- **커서에 반응하는 거리 · 성단의 숨 · 시차의 크기**: `config/space.ts`의 `interaction.cluster*` · `breath` · `particles.aware` · `camera.parallaxShiftPx`.
- **작품 ↔ 상세 화면 전환의 시간 · 가감속**: `config/motion.ts`의 `projectMotion.travel` · `travelEase`.
- **색 · 채도**: `styles/tokens.css`. 성단색이 묻는 정도는 `--chroma-tint`.
- **미디어 종류 추가**: `config/media.ts`의 `MEDIA_KINDS`에 한 항목. 새 표시 방식이 필요할 때만 `MediaViewer.tsx`의 `VIEWERS`, 썸네일을 만들 수 있으면 `archiveService.ts`의 `DESCRIBERS`.
- **프로젝트 상태 · 성단 색 추가**: `config/catalog.ts`.
- **IndexedDB 스키마 변경**: `config/app.ts`의 `ARCHIVE_DB.version`을 올리고 `services/storage/local/db.ts`의 `MIGRATIONS`에 같은 번호의 항목을 더한다. 이미 배포한 항목은 고치지 않는다.

## 배포

- `vercel.json`: 빌드(`npm run build`) · 출력(`dist`) · SPA rewrite. `/system/…` · `/project/…`를 직접 열어도 `index.html`이 응답한다.
- GitHub `main`에 push하면 Vercel이 자동으로 빌드 · 배포한다. 배포본의 기록은 그 주소의 브라우저에만 저장되며 로컬 개발 주소와 공유되지 않는다.
- push 전에 파일 이름의 대소문자를 확인한다. Windows는 구분하지 않지만 Vercel(Linux)은 구분하므로 import 경로와 다르면 빌드가 깨진다.

## 검증할 때

- Vite가 같은 파일의 연속 수정 중 뒤의 것을 놓칠 때가 있다(`… is not defined`). 디스크의 코드가 `npm run typecheck`를 통과하면 개발 서버를 재시작한다.
- 가려진 탭에서는 rAF와 CSS 애니메이션이 멈춘다. 화면 확인은 탭을 앞에 둔 상태에서 한다.
