/**
 * 은하의 배치 · 카메라 · 배경 수치.
 * 좌표 단위는 "world unit"이며 카메라 zoom이 곱해져 화면 px가 된다.
 * 항성계와 프로젝트의 위치는 여기 값과 순서(index)만으로 계산한다(features/galaxy/layout.ts).
 */
export const galaxyConfig = {
  spiral: {
    /** 이웃 항성계 사이의 기본 간격 */
    spacing: 330,
    /** 가장 큰 항성계 반지름 대비 최소 간격 배율 */
    clearance: 2.5,
    /** 0이면 첫 항성계가 은하 중심에 놓인다 */
    startIndex: 1.4,
    goldenAngleDeg: 137.508,
    rotationDeg: -24,
    /** 은하를 비스듬히 본 것처럼 한 축을 누르는 비율 */
    squash: 0.66,
  },
  star: { baseSize: 22, perProject: 2, maxSize: 46 },
  orbit: {
    firstRadius: 48,
    gap: 30,
    baseCapacity: 5,
    capacityStep: 4,
    /** 한 바퀴 도는 시간(초). 바깥 궤도일수록 느리다. */
    baseDuration: 110,
    durationStep: 46,
  },
  /** 항성계에 들어갔을 때의 화면 px 크기 */
  planet: {
    baseSize: 30,
    perEntry: 3,
    maxSize: 54,
    /** 은하 전체를 볼 때 행성이 줄어드는 비율 */
    moteScale: 0.4,
    maxMoons: 6,
    labelSpace: 34,
    /** 마우스를 올렸을 때 옆에 뜨는 미리보기 카드의 폭과 화면 가장자리 여백 */
    peekWidth: 250,
    peekMargin: 24,
  },
  camera: {
    overviewPadding: 0.84,
    /** max가 넉넉해야 4K처럼 큰 화면에서도 은하가 화면을 채운다 */
    overviewZoom: { min: 0.18, max: 3 },
    focusFill: 0.86,
    focusZoom: { min: 1.1, max: 6 },
    /** 프로젝트로 들어갈 때 항성계 zoom에 곱하는 배율 */
    projectZoomFactor: 2.8,
    /** 인트로가 끝나기 전 멀리서 바라보는 배율 */
    introZoomFactor: 0.38,
    /** 은하에서 이 배율 이상 확대하면 가까운 항성계로 들어간다 */
    enterFactor: 1.9,
    /** 항성계에서 이 배율 이하로 축소하면 은하로 나온다 */
    exitFactor: 0.62,
    wheelSensitivity: 0.0016,
    dragThreshold: 6,
    zoomIntentDelayMs: 220,
    boundsPadding: 260,
  },
  proximity: {
    /** 마우스가 항성계 반지름의 이 배율 안에 들어오면 이름이 나타난다 */
    radiusFactor: 1.25,
    extraPx: 70,
  },
  starfield: {
    /** 캔버스가 그리는 실제 픽셀 수의 상한: 4K(3840 × 2160)까지는 기기 해상도 그대로 그린다 */
    maxPixels: 3840 * 2160,
    /** 별의 수를 정하는 기준 화면과, 그보다 큰 화면에서 늘어나는 한도 */
    referenceArea: 1440 * 900,
    areaScale: [0.35, 3.5],
    /** 화면 밖 여유 비율. 시차와 확대 때 가장자리가 비지 않게 한다. */
    padding: 0.22,
    /** depth가 클수록 가까운 별: 카메라 이동에 크게 반응한다 */
    layers: [
      { depth: 0.06, count: 340, size: [0.4, 1.0], alpha: [0.25, 0.7] },
      { depth: 0.16, count: 190, size: [0.6, 1.5], alpha: [0.35, 0.9] },
      { depth: 0.34, count: 70, size: [0.9, 2.1], alpha: [0.5, 1] },
    ],
    panDepth: 0.55,
    zoomDepth: 0.55,
    pointerShift: 46,
    twinkle: 0.55,
    /** 프레임당 이 px 이상 움직이면 별이 빛줄기로 늘어난다 */
    streakThreshold: 1.6,
    streakGain: 2.4,
    dust: { count: 70, size: [0.6, 1.8], speed: 0.012, repelRadius: 150, repelForce: 0.9 },
    /** size: 성운 텍스처의 한 변(px). 화면이 크면 그에 맞춰 범위 안에서 커진다 */
    nebula: { size: [768, 1536], blobs: 9, alpha: 0.85, depth: 0.03, margin: 0.18 },
  },
} as const
