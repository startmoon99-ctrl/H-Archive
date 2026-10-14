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
      depthRange: 300,
    },
    node: {
      /** 작품 사이의 간격 */
      spread: 31,
      /** 0에 가까울수록 첫 작품이 중심에 붙는다 */
      startIndex: 1.9,
      squash: 0.8,
      /** 작품마다 달라지는 깊이의 폭 */
      depthRange: 34,
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
     * 작품을 열 때 성단 zoom에 곱하는 배율. 1보다 작으면 카메라가 한발 물러난다:
     * 작품의 이미지는 상세 화면으로 건너가고(features/project/SharedCover) 공간은 뒤로 밀린다.
     */
    projectZoomFactor: 0.8,
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
  },

  /** 조작 감도. interaction/* 이 읽는다. */
  interaction: {
    wheelSensitivity: 0.0014,
    dragThresholdPx: 6,
    zoomIntentDelayMs: 240,
    /** 놓기 직전에 멈춰 있었다면 관성을 주지 않는다 */
    staleVelocityMs: 80,
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
    /** 아주 먼 배경의 점. 거의 움직이지 않아 깊이의 기준이 된다 */
    far: { count: 1900, spread: 9500, depth: [-7500, -1900], size: [7, 21], alpha: [0.35, 1] },
    /** 공간을 채우는 먼지. 카메라가 이동할 때 곁을 지나간다 */
    dust: { count: 1000, margin: 1500, depth: [-900, 2800], size: [1.3, 3.6], alpha: [0.14, 0.5] },
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
    /** 초점에서 벗어난 입자가 번지는 크기(px) */
    blurPx: 16,
    maxPointPx: 170,
    twinkle: 0.5,
  },

  /** 성단 중심과 작품을 잇는 가는 선 */
  threads: { alpha: 0.16, activeAlpha: 0.6 },

  /** 화면 전체에 얹는 효과. effects/PostEffects 가 읽는다. */
  effects: {
    grainOpacity: 0.06,
    vignetteOpacity: 0.72,
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
} as const
