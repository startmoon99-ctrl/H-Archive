export const GRAPH = {
  node: {
    baseRadius: 10,
    radiusPerDegree: 2.2,
    maxRadius: 22,
    /** 터치 조작을 위한 최소 히트 영역 반지름 */
    minHitRadius: 22,
    iconScale: 1.05,
  },
  force: {
    linkDistance: 96,
    charge: -460,
    chargeDistanceMax: 480,
    gravity: 0.07,
    collidePadding: 24,
    warmupTicks: 220,
    reheatAlpha: 0.5,
    dragAlphaTarget: 0.25,
  },
  zoom: {
    min: 0.3,
    max: 2.6,
    fitMax: 1.25,
    /** 첫 화면은 라벨을 읽고 노드를 누를 수 있는 배율 아래로 줄이지 않는다 (넘치는 부분은 이동해서 본다) */
    comfortMin: 0.85,
    step: 1.35,
    wheelSpeed: 0.0016,
    /** 이 배율보다 축소되면 강조되지 않은 라벨을 숨긴다 */
    labelThreshold: 0.62,
  },
  gesture: {
    dragThreshold: 5,
    doubleTapMs: 320,
  },
  fit: {
    padding: 56,
    /** 좁은 화면에서는 맞춤 여백이 화면 폭의 이 비율을 넘지 않게 한다 */
    maxPaddingRatio: 0.07,
    labelAllowance: 24,
    delayMs: 420,
  },
  focus: {
    minDepth: 1,
    maxDepth: 3,
    defaultDepth: 1,
  },
  /** 선택한 노드를 화면 안쪽으로 유지할 여백 */
  safeMargin: 48,
  /** 모바일에서 BottomSheet가 올라왔을 때 그래프가 보이는 높이 비율 */
  mobileVisibleRatio: 0.5,
} as const;
