/**
 * 입자와 선을 그리는 셰이더. 원근 계산은 camera/cameraView.ts의 project()와 같은 식이어야
 * DOM으로 그리는 작품 · 성단과 WebGL로 그리는 입자가 한 공간에 놓인다.
 */

const PROJECTION = /* glsl */ `
uniform vec3 uCamera;   // 카메라 위치(world)
uniform vec3 uRight;    // 카메라의 오른쪽 · 아래 · 뒤 방향(world)
uniform vec3 uDown;
uniform vec3 uBack;
uniform float uFocal;   // 초점 거리(px)
uniform vec2 uHalf;     // 화면 크기의 절반(px)
uniform float uNear;

// world → 화면 중심 기준 px. 카메라 뒤면 depth가 uNear보다 작다. camera/cameraView.ts의 project()와 같은 식이다.
vec2 toScreen(vec3 p, out float depth, out float scale) {
  vec3 v = p - uCamera;
  depth = -dot(v, uBack);
  scale = uFocal / max(depth, 0.0001);
  return vec2(dot(v, uRight), dot(v, uDown)) * scale;
}

vec4 toClip(vec2 screen) {
  return vec4(screen.x / uHalf.x, -screen.y / uHalf.y, 0.0, 1.0);
}
`

/** 한 번에 함께 옮겨 그릴 수 있는 성단 수(성단 위치 조절). glRenderer와 environment가 같은 값을 쓴다 */
export const MAX_MOVES = 8

export const POINT_VERTEX = /* glsl */ `#version 300 es
precision highp float;
layout(location = 0) in vec3 aPosition;
layout(location = 1) in float aSize;
layout(location = 2) in vec4 aColor;
layout(location = 3) in float aSeed;
layout(location = 4) in float aBlur;
layout(location = 5) in vec4 aHome;     // xyz: 속한 성단의 중심, w: 성단 반지름(성단 입자가 아니면 0)
layout(location = 6) in float aPulse;   // 그 성단의 박자(0 ~ 1)
layout(location = 7) in vec2 aStar;     // x: 별의 종류(particleField.ts의 StarKind), y: 빛살을 내는 별의 차례 번호
${PROJECTION}
uniform float uDpr;
uniform float uTime;        // 초
uniform float uFocusDist;   // 카메라에서 초점면까지
uniform float uDrift;       // 제자리 흔들림(world)
uniform vec3 uPointer;      // xy: 화면 중심 기준 px, z: 밀어내는 세기
uniform float uRepelRadius;
uniform float uRepelPx;
uniform vec4 uBreath;       // xy: 숨의 주기 범위(초), z: 반지름이 변하는 비율, w: 밝기가 변하는 비율
uniform vec4 uAware;        // x: 알아차리는 범위(px), y: 가까운 범위(px), z: 세기, w: 커서 쪽으로 기우는 거리(px)
uniform vec3 uAwareEffect;  // 알아차린 성단의 입자: 밝기 · 모임 · 흔들림
uniform vec3 uWrap;         // xy: 입자가 감싸는 지점(화면 중심 기준 px), z: 세기
uniform vec2 uWrapShape;    // 범위(px), 다가오는 거리(px)
uniform float uBlurPx;
uniform float uMaxPoint;
uniform float uGlow;
uniform float uTwinkle;
// 옮겨 가는 성단: 입자를 만들 때의 중심(w가 1이면 사용) · 지금 자리까지의 거리 · 속도(world/s)
uniform vec4 uMoveFrom[${MAX_MOVES}];
uniform vec3 uMoveBy[${MAX_MOVES}];
uniform vec3 uMoveVelocity[${MAX_MOVES}];
uniform vec3 uTrail;        // xy: 입자가 늦게 따라오는 시간 범위(초), z: 꼬리 길이 상한(world)
// 배경의 별. 움직임의 크기에는 Background Motion 설정이 이미 곱해져 있다
uniform vec4 uStarPeriod;   // xy: 별가루가 옅어지는 주기 범위(초), zw: 반짝이는 별의 주기 범위(초)
uniform vec4 uStarFade;     // x: 별가루가 옅어지는 비율, y: 반짝이는 별이 옅어지는 비율, z: 크기가 변하는 비율, w: 빛무리 세기
uniform float uTwinkleLift; // 반짝이는 별이 가장 밝을 때 더 밝아지는 비율
uniform float uStarHalo;    // 빛무리 반지름(별 크기의 배수)
uniform vec3 uStarDrift;    // x: 떠다니는 거리(px), yz: 주기 범위(초)
uniform vec4 uSparkle;      // x: 차례 하나의 길이(초), y: 빛살을 내는 별의 수, z: 차례마다 빛날 확률, w: 빛살 길이(별 크기의 배수)
uniform vec2 uFlareSec;     // 빛살이 머무는 시간 범위(초)
uniform float uStarShare;   // 그리는 별가루 · 반짝이는 별의 비율(작은 화면에서 줄인다)
out vec4 vColor;
out float vSoft;
out vec4 vStar;             // x: 별의 종류, y: 별 크기(px), z: 빛무리 세기, w: 빛살(0 ~ 1)
out float vPointPx;

// 정수 → 0 ~ 1. 입자마다 · 차례마다 겹치지 않는 값을 만든다
float hash(uint x) {
  x ^= x >> 16u;
  x *= 0x7feb352du;
  x ^= x >> 15u;
  x *= 0x846ca68bu;
  x ^= x >> 16u;
  return float(x) / 4294967295.0;
}

// 주기(초)로 0 ~ 1 사이를 부드럽게 오간다
float wave(float period, float phase) {
  return 0.5 + 0.5 * sin(uTime * 6.2831853 / period + phase * 6.2831853);
}

void main() {
  // 옮겨 가는 성단의 입자는 무리째 함께 옮긴다. 입자마다 조금씩 늦게 따라와, 빠르게 끌면 꼬리처럼 늘어진다
  vec3 home = aHome.xyz;
  vec3 position = aPosition;
  if (aHome.w > 0.0) {
    for (int i = 0; i < ${MAX_MOVES}; i++) {
      if (uMoveFrom[i].w < 0.5 || distance(aHome.xyz, uMoveFrom[i].xyz) > 0.5) continue;
      vec3 trail = uMoveVelocity[i] * mix(uTrail.x, uTrail.y, aSeed);
      float trailLength = length(trail);
      if (trailLength > uTrail.z) trail *= uTrail.z / trailLength;
      home += uMoveBy[i];
      position += uMoveBy[i] - trail;
      break;
    }
  }

  // 성단에 속한 입자는 성단 단위로 반응한다: 중심이 화면의 어디에 있고 커서가 그 가장자리에서 얼마나 먼가.
  // 거리를 재는 기준(반지름의 절반)은 scene/sceneUpdater.ts와 같다.
  float homeDepth;
  float homeScale;
  vec2 homeScreen = toScreen(home, homeDepth, homeScale);
  float member = step(0.0001, aHome.w) * step(uNear, homeDepth);
  vec2 toPointer = uPointer.xy - homeScreen;
  float gap = length(toPointer) - aHome.w * homeScale * 0.5;
  float sense = member * uAware.z * clamp(1.0 - gap / uAware.x, 0.0, 1.0);
  float close = member * uAware.z * clamp(1.0 - gap / uAware.y, 0.0, 1.0);

  // 숨: 무리 전체가 아주 느리게 부풀고 가라앉는다. 식은 scene/sceneUpdater.ts의 breathOf와 같다.
  float breath = member * sin(uTime * 6.2831853 / mix(uBreath.x, uBreath.y, aPulse) + aPulse * 31.4159265);
  // 커서가 가까이 오면 중심으로 조금 모인다
  vec3 p = home + (position - home) * (1.0 + uBreath.z * breath - uAwareEffect.y * close);
  // 배경의 별은 아래에서 화면 px로 떠다닌다(world로 흔들면 카메라 가까이의 먼지가 크게 휘청인다)
  float star = step(0.5, aStar.x);
  if (star > 0.5 && aStar.x < 2.5 && hash(floatBitsToUint(aSeed) + 7u) > uStarShare) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    return;
  }
  float t = uTime * (0.25 + aSeed * 0.5);
  p.xy += vec2(sin(t + aSeed * 43.0), cos(t * 0.83 + aSeed * 19.0))
    * uDrift * aBlur * (1.0 - star) * (1.0 + uAwareEffect.z * sense);

  float depth;
  float scale;
  vec2 screen = toScreen(p, depth, scale);
  if (depth < uNear) {
    gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
    gl_PointSize = 0.0;
    return;
  }

  // 가까이 온 커서 쪽으로 무리가 아주 조금 기운다
  screen += toPointer / max(length(toPointer), 0.001) * uAware.w * close;

  // 커서 주변의 입자는 살짝 밀려난다
  vec2 away = screen - uPointer.xy;
  float distanceToPointer = length(away);
  screen += (away / max(distanceToPointer, 0.001))
    * uRepelPx * uPointer.z * aBlur * smoothstep(uRepelRadius, 0.0, distanceToPointer);

  // 돌아온 작품을 주변 입자가 잠시 감싼다
  vec2 inward = uWrap.xy - screen;
  float distanceToWrap = length(inward);
  float wrap = uWrap.z * aBlur * smoothstep(uWrapShape.x, 0.0, distanceToWrap);
  screen += inward / max(distanceToWrap, 0.001) * min(distanceToWrap, uWrapShape.y) * wrap;

  // 성단의 입자: 초점면에서 멀수록 번지고, 번진 만큼 옅어진다
  // 성단은 보는 대상이라 어느 각도에서도 또렷해야 한다: 성단의 입자는 공간의 초점면이 아니라
  // 자기 성단의 중심을 초점으로 삼는다(무리 안의 앞뒤만 아주 조금 번진다).
  // 배경의 별은 번지지 않는다: 원근과 관계없이 화면에서 늘 작고 또렷한 점이다.
  float focusDepth = mix(uFocusDist, homeDepth, member);
  float confusion = clamp(abs(depth - focusDepth) / uFocusDist, 0.0, 1.0) * aBlur * (1.0 - star);
  float core = aSize * scale;
  float size = core + confusion * uBlurPx;
  float twinkle = 1.0 - uTwinkle * (1.0 - aBlur) * (0.5 + 0.5 * sin(uTime * (0.5 + aSeed * 1.6) + aSeed * 90.0));
  float glow = 0.0;
  float flare = 0.0;
  // 점이 차지하는 칸(별 크기의 배수). 빛무리 · 빛살이 그 안에 그려진다
  float reach = 1.0;

  if (star > 0.5) {
    uint id = floatBitsToUint(aSeed);
    // 입자마다 다른 주기 · 시작 시점으로 몇 px만 아주 느리게 떠다닌다
    screen += (vec2(
      wave(mix(uStarDrift.y, uStarDrift.z, hash(id + 1u)), hash(id + 2u)),
      wave(mix(uStarDrift.y, uStarDrift.z, hash(id + 3u)), hash(id + 4u))
    ) - 0.5) * 2.0 * uStarDrift.x;
    size = aSize;
    core = aSize;
    float phase = hash(id + 6u);
    if (aStar.x < 1.5) {
      // 별가루: 밝기만 아주 느리게 오간다
      twinkle = 1.0 - uStarFade.x * wave(mix(uStarPeriod.x, uStarPeriod.y, hash(id + 5u)), phase);
    } else {
      // 반짝이는 별(과 빛살을 내는 별의 평소 모습): 밝기와 크기가 함께 천천히 오가고, 아주 옅은 빛무리가 있다
      float pulse = smoothstep(0.0, 1.0, wave(mix(uStarPeriod.z, uStarPeriod.w, hash(id + 5u)), phase));
      twinkle = (1.0 - uStarFade.y * (1.0 - pulse)) * (1.0 + uTwinkleLift * pulse * pulse);
      size *= 1.0 + uStarFade.z * (pulse - 0.5);
      glow = uStarFade.w;
      reach = uStarHalo * 2.0;
      if (aStar.x > 2.5) {
        // 빛살: 차례마다 많아야 별 하나가, 차례 안의 아무 때나 잠깐 빛난다. 그래서 둘이 함께 번쩍이지 않는다
        float slot = floor(uTime / uSparkle.x);
        uint turn = uint(slot) * 4u;
        // 차례가 짧은 단계에서도 빛살이 다음 차례에 잘리지 않도록 차례 안에 들어가게 한다
        float duration = min(mix(uFlareSec.x, uFlareSec.y, hash(turn + 2u)), uSparkle.x * 0.9);
        float start = (uSparkle.x - duration) * hash(turn + 3u);
        float progress = (uTime - slot * uSparkle.x - start) / duration;
        float chosen = floor(hash(turn + 1u) * uSparkle.y);
        float lit = step(hash(turn), uSparkle.z) * (1.0 - step(0.5, abs(aStar.y - chosen)));
        flare = lit * smoothstep(0.0, 0.2, progress) * (1.0 - smoothstep(0.2, 1.0, progress));
        reach = max(reach, uSparkle.w * 2.0 * flare);
      }
    }
  }

  float pixels = size * uDpr;
  // 1px보다 작은 점은 깜빡이지 않도록 크기 대신 밝기를 줄인다(별가루는 덜 줄여, 아주 옅은 점으로 남는다)
  float coverage = clamp(pixels, 0.0, 1.0);
  coverage = mix(coverage, sqrt(coverage), star);
  float energy = clamp((core * core) / (size * size), 0.06, 1.0);
  energy = mix(energy, 1.0, star);
  float nearFade = smoothstep(uNear, uNear * 9.0, depth);

  // 숨 · 커서 인식 · 감싸기에 따라 아주 조금 밝아진다
  float lift = 1.0 + uBreath.w * breath + uAwareEffect.x * sense + 0.5 * wrap;

  vColor = vec4(aColor.rgb, aColor.a * energy * coverage * coverage * twinkle * nearFade * uGlow * lift);
  vSoft = confusion;
  vStar = vec4(aStar.x, pixels, glow, flare);
  gl_PointSize = clamp(pixels * reach, 1.0, uMaxPoint * uDpr);
  vPointPx = gl_PointSize;
  gl_Position = toClip(screen);
}
`

export const POINT_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec4 vColor;
in float vSoft;
in vec4 vStar;
in float vPointPx;
out vec4 outColor;

void main() {
  float distanceFromCenter = length(gl_PointCoord - 0.5) * 2.0;
  float alpha;
  if (vStar.x < 0.5) {
    // 성단의 입자: 초점이 맞은 점은 가운데가 밝고, 번진 점은 고르게 퍼진 원반이 된다
    alpha = 1.0 - smoothstep(mix(0.0, 0.72, vSoft), 1.0, distanceFromCenter);
  } else {
    // 배경의 별: 또렷한 작은 점 + (반짝이는 별만) 아주 옅은 빛무리 + (빛날 때만) 가는 십자 빛살
    vec2 q = (gl_PointCoord - 0.5) * vPointPx;
    float radius = max(vStar.y, 1.0) * 0.5;
    float r = length(q) / radius;
    float body = 1.0 - smoothstep(0.55, 1.15, r);
    float halo = vStar.z * exp(-r * r * 0.6);
    vec2 arm = abs(q) / (vPointPx * 0.5);
    float thin = max(radius * 0.35, 0.5);
    vec2 across = abs(q.yx) / thin;
    float rays = exp(-across.x * across.x * 0.5) * pow(max(1.0 - arm.x, 0.0), 3.0)
      + exp(-across.y * across.y * 0.5) * pow(max(1.0 - arm.y, 0.0), 3.0);
    alpha = body * (1.0 + vStar.w) + halo * (1.0 + vStar.w) + rays * vStar.w;
  }
  outColor = vec4(vColor.rgb * vColor.a * alpha, vColor.a * alpha);
}
`

export const LINE_VERTEX = /* glsl */ `#version 300 es
precision highp float;
layout(location = 0) in vec3 aPosition;
layout(location = 1) in float aAlpha;
${PROJECTION}
out float vAlpha;

void main() {
  float depth;
  float scale;
  vec2 screen = toScreen(aPosition, depth, scale);
  vAlpha = aAlpha * smoothstep(uNear, uNear * 6.0, depth);
  gl_Position = toClip(screen);
}
`

export const LINE_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
uniform vec3 uColor;
in float vAlpha;
out vec4 outColor;

void main() {
  outColor = vec4(uColor * vAlpha, vAlpha);
}
`

/** 별똥별을 가리는 성단 수의 상한. glRenderer와 environment가 같은 값을 쓴다 */
export const MAX_COVERS = 8

/**
 * 별똥별: meteors.ts가 화면 px로 만든 사각형을 그대로 그린다.
 * uShape 0 = 빛줄기(꼬리에서 머리로 갈수록 밝고 가장자리는 부드럽다), 1 = 사라지는 빛(uBurstKind의 모습).
 * 별똥별은 성단보다 멀리 있으므로, 성단이 놓인 자리(uCover)에서는 그 뒤로 가려진다.
 */
export const STREAK_VERTEX = /* glsl */ `#version 300 es
precision highp float;
layout(location = 0) in vec2 aScreen;   // 화면 중심 기준 px
layout(location = 1) in float aAlpha;   // 빛줄기: 꼬리 0 ~ 머리, 사라지는 빛: 그 순간의 밝기
layout(location = 2) in vec2 aCoord;    // 빛줄기: y가 띠의 가로 위치(-1 ~ 1), 사라지는 빛: 중심 기준 위치(-1 ~ 1)
uniform vec2 uHalf;
out float vAlpha;
out vec2 vCoord;
out vec2 vScreen;

void main() {
  vAlpha = aAlpha;
  vCoord = aCoord;
  vScreen = aScreen;
  gl_Position = vec4(aScreen.x / uHalf.x, -aScreen.y / uHalf.y, 0.0, 1.0);
}
`

export const STREAK_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
uniform vec3 uColor;
uniform float uShape;
uniform float uBurstKind;   // 0 십자 · 1 별빛(십자 + 대각선) · 2 섬광(진행 방향) · 3 두 번 깜빡임 · 4 불티
uniform float uBurstPx;     // 사라지는 빛의 크기(px)
uniform float uBurstPhase;  // 사라지는 빛의 진행(0 ~ 1)
uniform vec2 uBurstDir;     // 별똥별이 나아가던 방향(화면, 길이 1)
uniform float uBurstSeed;   // 별똥별마다 다른 값(0 ~ 1)
uniform vec4 uCover[${MAX_COVERS}];  // 가리는 성단: xy 화면 중심 기준 px, z 반지름(px), w 가리는 세기
uniform int uCoverCount;
uniform float uCoverInner;  // 이 비율(반지름 대비) 안쪽에서는 다 가려진다
in float vAlpha;
in vec2 vCoord;
in vec2 vScreen;
out vec4 outColor;

// 가는 빛살 두 줄(가로 · 세로). q: 중심에서의 px, arm: 끝까지의 비율(0 ~ 1)
float rays(vec2 q, vec2 arm, float thin) {
  vec2 across = abs(q.yx) / thin;
  return exp(-across.x * across.x * 0.5) * pow(max(1.0 - arm.x, 0.0), 3.0)
    + exp(-across.y * across.y * 0.5) * pow(max(1.0 - arm.y, 0.0), 3.0);
}

// 별똥별마다 달라지는 0 ~ 1
float scatter(float n) {
  return fract(sin(n * 12.9898 + uBurstSeed * 78.233) * 43758.5453);
}

float burst() {
  vec2 q = vCoord * uBurstPx;
  float r2 = dot(q, q);
  float thin = max(uBurstPx * 0.035, 0.55);
  float core = exp(-r2 / (8.0 * thin * thin));
  if (uBurstKind < 0.5 || (uBurstKind > 2.5 && uBurstKind < 3.5)) {
    // 십자 빛살(두 번 깜빡일 때도 같은 모양)
    return rays(q, abs(vCoord), thin) + core;
  }
  if (uBurstKind < 1.5) {
    // 별빛: 긴 십자에 조금 짧고 옅은 대각선 빛살
    vec2 turned = vec2(vCoord.x + vCoord.y, vCoord.y - vCoord.x) * 0.70710678;
    return rays(q, abs(vCoord), thin)
      + 0.7 * rays(turned * uBurstPx, abs(turned) * 1.5, thin * 0.85)
      + core;
  }
  if (uBurstKind < 2.5) {
    // 섬광: 나아가던 쪽으로 가늘고 길게 번쩍인다(앞쪽이 뒤쪽보다 길다)
    vec2 heading = uBurstDir;
    float along = dot(q, heading);
    float side = dot(q, vec2(-heading.y, heading.x));
    float reach = uBurstPx * (along > 0.0 ? 1.0 : 0.4);
    float streak = exp(-side * side / (2.0 * thin * thin)) * pow(max(1.0 - abs(along) / reach, 0.0), 2.0);
    return streak + core;
  }
  // 불티: 나아가던 쪽으로 작은 점 몇 개가 흩어지며 하나씩 꺼진다. 처음에는 머리가 잠깐 밝아진다
  float sparks = 0.0;
  float heading = atan(uBurstDir.y, uBurstDir.x);
  float spark = max(thin * 0.75, 0.6);
  for (int i = 0; i < 6; i++) {
    float a = scatter(float(i) + 1.0);
    float b = scatter(float(i) + 11.0);
    float angle = heading + (a - 0.5) * 1.7;
    float reach = uBurstPx * (0.35 + 0.65 * b) * (1.0 - pow(1.0 - uBurstPhase, 2.5));
    vec2 offset = q - vec2(cos(angle), sin(angle)) * reach;
    float fade = 1.0 - smoothstep(0.15 + 0.5 * b, 0.95, uBurstPhase);
    sparks += exp(-dot(offset, offset) / (2.0 * spark * spark)) * fade * (0.35 + 0.35 * a);
  }
  float glare = smoothstep(0.0, 0.08, uBurstPhase) * (1.0 - smoothstep(0.08, 0.4, uBurstPhase));
  return sparks + core * (0.2 + 1.2 * glare) * (1.0 - smoothstep(0.2, 0.6, uBurstPhase));
}

void main() {
  float alpha;
  if (uShape < 0.5) {
    // 빛이 머리 쪽에 모이도록 제곱하고, 띠의 가장자리로 갈수록 옅어진다
    alpha = vAlpha * vAlpha * (1.0 - smoothstep(0.25, 1.0, abs(vCoord.y)));
  } else {
    alpha = vAlpha * burst();
  }
  // 성단 뒤로 지나갈 때: 성단의 가장자리에서 옅어지기 시작해 안쪽에서는 거의 가려진다
  float hidden = 0.0;
  for (int i = 0; i < ${MAX_COVERS}; i++) {
    if (i >= uCoverCount) break;
    vec4 cover = uCover[i];
    float gap = length(vScreen - cover.xy);
    hidden = max(hidden, cover.w * (1.0 - smoothstep(cover.z * uCoverInner, cover.z, gap)));
  }
  alpha *= 1.0 - hidden;
  outColor = vec4(uColor * alpha, alpha);
}
`

/**
 * 가장 뒤의 배경: 화면 전체를 덮는 삼각형 하나에 정거원통 파노라마를 그린다.
 * 픽셀마다 카메라에서 나가는 방향을 구해(toScreen의 반대) 경도 · 위도로 이미지를 읽는다.
 * 카메라의 위치는 쓰지 않으므로 이동 · 확대에는 움직이지 않고 방향에만 따른다.
 */
export const BACKDROP_VERTEX = /* glsl */ `#version 300 es
precision highp float;
out vec2 vNdc;

void main() {
  // 화면을 덮는 큰 삼각형(꼭짓점 셋, 버퍼 없이 gl_VertexID로)
  vec2 corner = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2)) * 2.0 - 1.0;
  vNdc = corner;
  gl_Position = vec4(corner, 0.0, 1.0);
}
`

export const BACKDROP_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
uniform sampler2D uImage;
uniform vec3 uRight;
uniform vec3 uDown;
uniform vec3 uBack;
uniform float uFocal;
uniform vec2 uHalf;
uniform float uYawOffset;   // 라디안
uniform vec3 uTone;         // x: 밝기, y: 채도, z: 불투명도(나타나는 정도)
in vec2 vNdc;
out vec4 outColor;

void main() {
  // 이 픽셀을 지나는 시선의 방향(world, y는 아래)
  vec2 screen = vec2(vNdc.x * uHalf.x, -vNdc.y * uHalf.y);
  vec3 dir = normalize(uRight * screen.x + uDown * screen.y - uBack * uFocal);
  // 처음 구도(-z를 바라봄)가 이미지의 가로 가운데에 오도록 경도를 잰다
  float longitude = atan(dir.x, -dir.z) + uYawOffset;
  float latitude = asin(clamp(-dir.y, -1.0, 1.0));
  vec2 uv = vec2(0.5 + longitude / 6.2831853, 0.5 - latitude / 3.1415927);
  vec3 color = texture(uImage, uv).rgb;
  float gray = dot(color, vec3(0.2126, 0.7152, 0.0722));
  color = mix(vec3(gray), color, uTone.y) * uTone.x;
  outColor = vec4(color * uTone.z, uTone.z);
}
`
