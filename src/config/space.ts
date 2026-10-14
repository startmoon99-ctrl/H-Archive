/**
 * 공간(장면)의 단일 출처: 배치 · 카메라 · 조작 감도 · 입자 · 효과 · 품질.
 * 좌표 단위는 world unit이며, 원근 카메라를 거쳐 화면 px가 된다(초점면에서는 zoom배).
 * 느낌을 바꾸고 싶을 때는 코드를 고치지 않고 이 파일의 값만 조절한다.
 * 시간 · easing · 프리셋처럼 앱 전체가 쓰는 모션 값은 config/motion.ts에 있다.
 */

function easeInOutQuint(t: number): number {
  return t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2
}

export const spaceConfig = {
  /** 데이터 → 위치. 저장된 좌표 없이 만든 순서로만 계산한다(scene/layout.ts). */
  layout: {
    cluster: {
      /** 이웃 성단 사이의 기본 간격 */
      spacing: 330,
      /** 가장 큰 성단 반지름 대비 최소 간격 배율 */
      clearance: 2.2,
      startIndex: 1.4,
      goldenAngleDeg: 137.508,
      rotationDeg: -24,
      /** 화면 비율에 맞춰 한 축을 누르는 비율 */
      squash: 0.66,
      /** 성단마다 달라지는 깊이의 폭. 클수록 성단 사이의 원근감이 커진다 */
      depthRange: 560,
    },
    node: {
      /** 작품 사이의 간격 */
      spread: 31,
      /** 0에 가까울수록 첫 작품이 중심에 붙는다 */
      startIndex: 1.9,
      squash: 0.8,
      /** 작품마다 달라지는 깊이의 폭 */
      depthRange: 120,
      /** 프레임의 크기(world). 기록이 많을수록 조금 커진다 */
      width: 38,
      height: 25,
      growPerEntry: 0.03,
      maxGrow: 0.2,
      /** 성단 가장자리의 여백 */
      margin: 26,
    },
    /** 이름표를 위해 비워 두는 화면 여백(px) */
    labelSpacePx: 34,
  },

  camera: {
    /** 초점 거리 = 이 비율 × 화면의 (폭 + 높이) / 2. 작을수록 원근이 강해진다 */
    focalRatio: 0.9,
    /** 이보다 가까운 것은 그리지 않는다 */
    near: 12,
    /** 입력을 따라붙는 데 걸리는 시간(ms). 클수록 느긋하고 무겁다 */
    followMs: 120,
    /** 이동할 때의 가감속 곡선 */
    travelEase: easeInOutQuint,
    /** 드래그를 놓은 뒤 프레임(16ms)마다 남는 속도 비율 */
    inertiaFriction: 0.94,
    minInertia: 0.01,
    overviewPadding: 0.86,
    overviewZoom: { min: 0.15, max: 3 },
    focusFill: 0.84,
    focusZoom: { min: 1, max: 5.2 },
    /**
     * 작품을 열 때 성단 zoom에 곱하는 배율. 카메라가 그 작품(x · y · z)으로 다가가며 작품이 이만큼 커진다.
     * 다가간 뒤 이미지가 상세 화면의 대표 이미지 자리로 넘어간다(features/project/SharedCover).
     */
    projectZoomFactor: 3.2,
    /** 성단 위치 조절에 들어갈 때 전체 보기 배율에 곱한다. 화면 아래의 막대에 성단이 가리지 않게 조금 물러난다 */
    arrangeZoomFactor: 0.84,
    /** 인트로가 끝나기 전 멀리서 바라보는 배율 */
    introZoomFactor: 0.22,
    /** 전체 보기에서 이 배율 이상 확대하면 가까운 성단으로 들어간다 */
    enterFactor: 1.9,
    /** 성단에서 이 배율 이하로 축소하면 전체 보기로 나온다 */
    exitFactor: 0.62,
    boundsPadding: 320,
    /**
     * 마우스에 따른 시차: 화면 끝에서 초점면(성단이 놓인 층)이 밀리는 거리(px)와 따라오는 시간.
     * 원근이 나머지를 정한다: 먼 점은 이 값의 1/5 이하로, 카메라 앞의 먼지는 1.5 ~ 3배로 움직인다.
     * 크게 잡으면 깊이가 아니라 화면 전체가 미끄러지는 것처럼 보인다.
     */
    parallaxShiftPx: 4,
    parallaxFollowMs: 560,
    /** 입력이 없어도 공간이 살아 있도록 카메라가 아주 느리게 떠다니는 폭(px)과 속도 */
    idleDriftPx: 7,
    idleDriftSpeed: 0.00011,
    /**
     * 가만히 있을 때의 공전(전체 보기에서만): 아무 입력이 없으면 천천히 끄는 것처럼 각도가 바뀌며,
     * 성단을 바라본 채 떠돈다. 입력이 들어오면 부드럽게 멈추고 각도는 그 자리에 남는다.
     * 움직임에는 Background Motion이 곱해진다(동작 줄이기에서는 움직이지 않는다).
     */
    idleOrbit: {
      /** 마지막 입력(끌기 · 휠 · 마우스 이동 · 이동)에서 이만큼 지나면 시작한다(ms) */
      delayMs: 6000,
      /** 시작할 때 천천히 붙는 시간 · 입력이 들어와 멈출 때 떨어지는 시간(ms) */
      easeInMs: 5000,
      easeOutMs: 500,
      /** 도는 빠르기(도/초, 좌우 기준. 위아래는 범위 비율만큼 느리다) */
      speedDegPerSec: 0.8,
      /** 가만히 있기 시작한 각도에서 벗어나는 범위(도). 이 안에서 성단을 바라보며 떠돈다 */
      yawRangeDeg: 45,
      pitchRangeDeg: 15,
      /** 이만큼마다 방향을 새로 정하고(초), 새 방향으로 돌아서는 시간(ms, 이 시간의 약 3배에 걸쳐 다 돈다) */
      turnEverySec: 60,
      turnMs: 4000,
      /** 새 방향이 지금 방향과 이 각도(도) 이상 달라지게 고른다 */
      minTurnDeg: 45,
    },
  },

  /** 조작 감도. interaction/* 이 읽는다. */
  interaction: {
    wheelSensitivity: 0.0014,
    dragThresholdPx: 6,
    zoomIntentDelayMs: 240,
    /** 빈 곳을 두 번 탭했다고 보는 간격(ms)과 두 탭 사이의 거리(px). 카메라가 처음 구도로 돌아간다 */
    doubleTapMs: 320,
    doubleTapPx: 30,
    /** 놓기 직전에 멈춰 있었다면 관성을 주지 않는다 */
    staleVelocityMs: 80,
    /**
     * 끌기 = 초점을 중심으로 한 공전(Orbit). 끈 px당 도는 각도와, 화면이 뒤집히지 않도록 위아래로 기울 수 있는 한계.
     * 좌우(yaw)는 제한 없이 돈다.
     */
    orbitDegPerPx: 0.22,
    orbitPitchLimitDeg: 65,
    /**
     * 커서가 다가올 때 성단이 반응하는 범위(px, 성단 가장자리부터)와 따라오는 시간.
     * sense: 멀리서 알아차린다(빛 · 입자가 아주 조금) / reach: 가까이 왔다(이름표 · 중심이 커서 쪽으로 기운다)
     */
    clusterSenseReachPx: 280,
    clusterReachPx: 150,
    /** 가까이 온 커서 쪽으로 성단의 중심이 기우는 거리(px) */
    clusterLeanPx: 5,
    nodeReachPx: 190,
    proximityFollowMs: 170,
    /** 미리보기 글이 화면 밖으로 나가지 않게 필요한 폭(px) */
    captionWidthPx: 240,
  },

  /** 작품이 제자리에서 떠 있는 움직임 */
  float: { amplitude: 1.6, speed: 0.00042 },

  /**
   * 성단의 숨: 아무것도 하지 않아도 아주 느리게 부풀고 가라앉는다.
   * 주기는 성단마다 이 범위 안에서 다르고 박자도 어긋나 있어 함께 움직이지 않는다.
   * radius · glow는 입자 무리의 반지름과 밝기가 변하는 비율(Background Motion 설정이 곱해진다).
   */
  breath: { periodSec: [7, 11], radius: 0.045, glow: 0.1 },

  /** 입자. environment/* 이 읽는다. 수는 Particle Density 설정과 품질 단계가 곱해진다. */
  particles: {
    /**
     * 아주 먼 배경의 점. 공간을 둘러싼 구 껍질(반지름 범위)에 흩어 두어, 카메라가 어느 쪽으로 돌아도
     * 배경이 비지 않는다. 거의 움직이지 않아 깊이의 기준이 된다
     */
    far: { count: 7600, radius: [5200, 9000], alpha: [0.45, 1] },
    /** 공간을 채우는 먼지. 카메라가 이동할 때 곁을 지나간다 */
    dust: { count: 1000, margin: 1500, depth: [-900, 2800], alpha: [0.2, 0.6] },
    /**
     * 배경(먼 점 · 먼지)의 별. 원근 · 초점과 관계없이 화면에서 늘 작고 또렷한 점이다(크기는 CSS px, 화면 배율이 곱해진다).
     * 대부분은 별가루, 일부는 천천히 반짝이는 별, 극소수는 가끔 십자 빛살을 내는 별이다.
     * 움직임(옅어짐 · 반짝임 · 빛살 · 표류)은 Background Motion 설정이 곱해져, 동작 줄이기에서는 멈춘 점이 된다.
     */
    stars: {
      /** 별가루: 아주 느리게 옅어졌다 돌아온다(주기 · 옅어지는 정도는 levels) */
      micro: { size: [0.5, 1.5] },
      /** 반짝이는 별: 밝기와 크기가 함께 변하고, 아주 옅은 빛무리(반지름 = 크기 × halo)가 있다(비율 · 주기 · 변하는 정도는 levels) */
      twinkle: { size: [1.5, 3], halo: 2 },
      /**
       * 빛살: 성단 둘레(반지름 × spread)에 놓인 몇 개의 별. 차례(levels의 flareSlotSec)마다 많아야 하나가
       * flareChance의 확률로 잠깐(flareSec) 십자 빛살을 낸다. 그래서 둘이 함께 번쩍이지 않는다. 빛살 길이 = 크기 × rays
       */
      sparkle: {
        count: 12,
        size: [1.6, 2.2],
        alpha: [0.6, 0.85],
        spread: [1.1, 2.4],
        flareSec: [0.3, 0.8],
        rays: 9,
      },
      /** 모든 배경 점이 제자리에서 떠다니는 주기 범위(초). 거리는 levels */
      driftPeriodSec: [10, 30],
      /**
       * 작은 화면에서 그리는 별의 비율 = (초점 거리 / referenceFocalPx)^power, 최대 1.
       * 초점 거리가 짧은 화면(휴대폰)은 같은 별이 좁은 화면에 몰려 빽빽해 보이므로 일부만 그린다(빛살 별은 늘 그린다)
       */
      screen: { referenceFocalPx: 1350, power: 1.5 },
      /**
       * 별빛의 생동감(설정 → Space → 별빛). 0번이 기본이고, 한 단계 오를 때마다 눈에 띄게 반짝임 · 빛살 · 표류가 잦고 커진다.
       * twinkleShare: 배경 점 중 반짝이는 별의 비율 · twinklePeriodSec / twinkleFade: 반짝이는 주기(초)와 옅어지는 비율
       * twinkleGrow / twinkleGlow: 반짝일 때 크기가 변하는 비율과 빛무리 세기 · twinkleLift: 가장 밝을 때 더 밝아지는 비율
       * microPeriodSec / microFade: 별가루가 옅어지는 주기(초)와 비율 · flareSlotSec / flareChance: 빛살의 차례(초)와 확률
       * driftPx: 떠다니는 거리(px). 빛살 · 반짝임 · 표류에는 Background Motion 설정이 함께 곱해진다
       */
      levels: [
        {
          label: '기본',
          twinkleShare: 0.07,
          twinklePeriodSec: [3, 8],
          twinkleFade: 0.7,
          twinkleGrow: 0.3,
          twinkleGlow: 0.1,
          twinkleLift: 0,
          microPeriodSec: [9, 22],
          microFade: 0.5,
          flareSlotSec: 3,
          flareChance: 0.5,
          driftPx: 2.5,
        },
        {
          label: '조금 더 살아있게',
          twinkleShare: 0.13,
          twinklePeriodSec: [2, 5.5],
          twinkleFade: 0.85,
          twinkleGrow: 0.5,
          twinkleGlow: 0.13,
          twinkleLift: 0.5,
          microPeriodSec: [5, 13],
          microFade: 0.7,
          flareSlotSec: 1.8,
          flareChance: 0.65,
          driftPx: 4.5,
        },
        {
          label: '더 살아있게',
          twinkleShare: 0.21,
          twinklePeriodSec: [1.4, 3.8],
          twinkleFade: 0.95,
          twinkleGrow: 0.7,
          twinkleGlow: 0.16,
          twinkleLift: 1,
          microPeriodSec: [3, 8],
          microFade: 0.85,
          flareSlotSec: 1.1,
          flareChance: 0.8,
          driftPx: 7,
        },
        {
          label: '아주 살아있게',
          twinkleShare: 0.3,
          twinklePeriodSec: [0.9, 2.6],
          twinkleFade: 1,
          twinkleGrow: 0.9,
          twinkleGlow: 0.2,
          twinkleLift: 1.6,
          microPeriodSec: [2, 5],
          microFade: 0.95,
          flareSlotSec: 0.7,
          flareChance: 0.9,
          driftPx: 10,
        },
      ],
    },
    /**
     * 별똥별(설정 → Space → 별빛, 기본으로 켜져 있다). 멀리서 가는 빛줄기 하나가 천천히 지나가다 멈추며,
     * 꼬리를 거두고 bursts 중 하나의 모습으로 반짝인 뒤 사라진다. 크기는 CSS px(화면 배율이 곱해진다).
     * 성단보다 멀리 있으므로 성단과 겹치면 그 뒤로 가려진다(behindClusters).
     * 동작 줄이기(Background Motion 0)나 상세 화면 뒤 · 인트로에서는 나타나지 않는다.
     */
    meteors: {
      /** 하나가 사라진 뒤 다음이 나타나기까지(초). 지나가는 시간과 합쳐 10초 안에 하나씩 나온다 */
      gapSec: [3, 5.5],
      /** 빛줄기: 지나가는 시간(초) · 움직이는 거리(px) · 꼬리 길이(px) · 밝기 */
      durationSec: [2.4, 3.2],
      travelPx: [180, 300],
      tailPx: [150, 240],
      alpha: 0.65,
      /** 머리 쪽 굵기(px). 꼬리 끝으로 갈수록 가늘어진다 */
      widthPx: 1.6,
      /**
       * 사라질 때의 모습. 별똥별마다 하나를 무작위로 고르고(weight 비율, 바로 앞과 같은 것은 피한다),
       * 시간(초) · 크기(px, 빛살 길이나 퍼지는 거리) · 밝기를 정한다. 모양은 environment/shaders.ts의 STREAK_FRAGMENT.
       * cross: 십자 빛살 ✦ · glint: 긴 십자에 짧은 대각선이 더해진 별빛 · flare: 나아가던 쪽으로 가늘고 길게 번쩍이는 섬광
       * twice: 두 번 깜빡이는 십자 · embers: 진행 방향으로 흩어지며 꺼지는 불티
       */
      bursts: [
        { kind: 'cross', weight: 1, durationSec: 0.7, sizePx: 20, alpha: 0.9 },
        { kind: 'glint', weight: 1, durationSec: 0.85, sizePx: 26, alpha: 0.85 },
        { kind: 'flare', weight: 1, durationSec: 0.6, sizePx: 30, alpha: 0.85 },
        { kind: 'twice', weight: 1, durationSec: 1, sizePx: 18, alpha: 0.85 },
        { kind: 'embers', weight: 1, durationSec: 1.2, sizePx: 30, alpha: 0.85 },
      ],
      /**
       * 성단 뒤로 지나갈 때 가려지는 범위: 성단 반지름 × radiusFactor 안에서 옅어지기 시작해
       * × inner 안쪽에서는 strength만큼 가려진다
       */
      behindClusters: { radiusFactor: 1.15, inner: 0.45, strength: 0.92 },
      /** 내려가는 각도 범위(도, 가로 기준) */
      angleDeg: [16, 46],
      /** 나타나는 영역(화면 크기 대비). 위쪽에 치우친다 */
      area: { x: [0.1, 0.9], y: [0.06, 0.5] },
      /** 카메라에서의 거리(world). 멀어서 시차가 작다 */
      distance: 5000,
    },
    /**
     * 배경 점과 먼지가 퍼지는 범위를 이 간격(world)으로 끊어 잡는다. 성단을 조금 옮겨도 범위가 그대로라
     * 입자를 다시 만들 때 배경이 튀지 않는다(성단 위치 조절)
     */
    fieldGrid: 1200,
    /** 성단을 이루는 입자 무리 */
    cluster: {
      base: 170,
      perProject: 30,
      max: 620,
      radiusFactor: 1.35,
      depthFactor: 0.9,
      size: [0.9, 2.8],
      alpha: [0.3, 0.9],
      /** 성단 색이 입자에 묻는 정도. 0이면 무채색 */
      chroma: 0.05,
    },
    /** 제자리에서 흔들리는 폭(world) */
    drift: 5,
    /** 커서 주변의 입자가 밀려나는 범위와 거리(px) */
    repelRadiusPx: 160,
    repelPx: 20,
    /** 커서를 알아차린 성단의 입자: 밝아지는 비율 · 중심으로 모이는 비율 · 흔들림이 커지는 비율 */
    aware: { glow: 0.3, gather: 0.06, drift: 1 },
    /** 상세 화면에서 돌아온 작품을 주변 입자가 잠시 감싸는 범위와 다가오는 거리(px) */
    wrapRadiusPx: 240,
    wrapPx: 22,
    /** 초점에서 벗어난 성단 입자가 번지는 크기(px) */
    blurPx: 16,
    maxPointPx: 170,
    /** 성단 입자가 반짝이는 정도. 배경의 별은 stars가 정한다 */
    twinkle: 0.5,
  },

  /** 성단 중심과 작품을 잇는 가는 선 */
  threads: { alpha: 0.16, activeAlpha: 0.6 },

  /** 화면 전체에 얹는 효과. effects/PostEffects 가 읽는다. */
  effects: {
    grainOpacity: 0.06,
    vignetteOpacity: 0.72,
    /**
     * 작품 프레임이 커지는 정도: 선택(Hover · Rail)됐을 때의 배율과, 커서가 가까울수록 더해지는 비율.
     * effects/node-effects.css가 그리고, 상세 화면에서 돌아오는 이미지도 같은 크기에 내려앉는다.
     */
    workActiveScale: 1.07,
    workNearScale: 0.05,
  },

  /**
   * 렌더 품질. 프레임이 느려지면 한 단계씩 낮추고, 여유가 있으면 다시 올린다.
   * 4K에서도 무조건 최대 해상도로 그리지 않고 기기가 감당하는 만큼만 쓴다.
   */
  quality: {
    /**
     * 상세 화면 뒤에서 공간을 이어 그리는 간격(ms). 화면은 쉬고(성단 · 작품은 그리지 않는다)
     * 입자만 낮은 빈도로 아주 느리게 움직여 상세 화면에서도 분위기가 끊기지 않게 한다.
     */
    behindFrameMs: 33,
    /** 캔버스가 그리는 실제 픽셀 수의 상한 */
    maxPixels: 3840 * 2160,
    /** 단계별 해상도 배율과 입자 비율. 0번이 가장 높다 */
    steps: [
      { renderScale: 1, particles: 1, grain: true },
      { renderScale: 0.85, particles: 0.8, grain: true },
      { renderScale: 0.7, particles: 0.6, grain: false },
      { renderScale: 0.55, particles: 0.4, grain: false },
    ],
    /** 터치 기기가 시작하는 단계 */
    touchStartStep: 1,
    /** 평균 프레임 시간이 이보다 길면 낮추고, 짧으면 올린다(ms) */
    slowFrameMs: 24,
    fastFrameMs: 13,
    /** 그 상태가 이만큼 이어져야 단계를 바꾼다(ms) */
    downAfterMs: 1400,
    upAfterMs: 6000,
  },

  /** 성단 위치 조절(설정 → Space → 성단 위치 조절) */
  arrange: {
    /** 끄는 동안 성단이 손을 따라오는 시간(ms). 클수록 무겁게 끌려온다 */
    holdFollowMs: 110,
    /** 놓거나 자리가 바뀐 성단이 새 자리에 내려앉는 시간(ms) */
    settleFollowMs: 240,
    /** 무리의 입자가 성단보다 늦게 따라오는 시간(초, 입자마다 이 범위). 빠르게 끌면 꼬리처럼 늘어진다 */
    trailSec: [0.03, 0.2],
    /** 꼬리 길이의 상한(world) */
    trailMax: 240,
    /** 이만큼 가까워지면 다 왔다고 본다(world) */
    settleEpsilon: 0.5,
  },
} as const
