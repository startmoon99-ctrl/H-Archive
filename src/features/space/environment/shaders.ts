/**
 * 입자와 선을 그리는 셰이더. 원근 계산은 camera/cameraView.ts의 project()와 같은 식이어야
 * DOM으로 그리는 작품 · 성단과 WebGL로 그리는 입자가 한 공간에 놓인다.
 */

const PROJECTION = /* glsl */ `
uniform vec3 uCamera;   // 카메라 위치(world)
uniform float uFocal;   // 초점 거리(px)
uniform vec2 uHalf;     // 화면 크기의 절반(px)
uniform float uNear;

// world → 화면 중심 기준 px. 카메라 뒤면 depth가 uNear보다 작다.
vec2 toScreen(vec3 p, out float depth, out float scale) {
  depth = uCamera.z - p.z;
  scale = uFocal / max(depth, 0.0001);
  return (p.xy - uCamera.xy) * scale;
}

vec4 toClip(vec2 screen) {
  return vec4(screen.x / uHalf.x, -screen.y / uHalf.y, 0.0, 1.0);
}
`

export const POINT_VERTEX = /* glsl */ `#version 300 es
precision highp float;
layout(location = 0) in vec3 aPosition;
layout(location = 1) in float aSize;
layout(location = 2) in vec4 aColor;
layout(location = 3) in float aSeed;
layout(location = 4) in float aBlur;
layout(location = 5) in vec4 aHome;     // xyz: 속한 성단의 중심, w: 성단 반지름(성단 입자가 아니면 0)
layout(location = 6) in float aPulse;   // 그 성단의 박자(0 ~ 1)
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
out vec4 vColor;
out float vSoft;

void main() {
  // 성단에 속한 입자는 성단 단위로 반응한다: 중심이 화면의 어디에 있고 커서가 그 가장자리에서 얼마나 먼가.
  // 거리를 재는 기준(반지름의 절반)은 scene/sceneUpdater.ts와 같다.
  float homeDepth;
  float homeScale;
  vec2 homeScreen = toScreen(aHome.xyz, homeDepth, homeScale);
  float member = step(0.0001, aHome.w) * step(uNear, homeDepth);
  vec2 toPointer = uPointer.xy - homeScreen;
  float gap = length(toPointer) - aHome.w * homeScale * 0.5;
  float sense = member * uAware.z * clamp(1.0 - gap / uAware.x, 0.0, 1.0);
  float close = member * uAware.z * clamp(1.0 - gap / uAware.y, 0.0, 1.0);

  // 숨: 무리 전체가 아주 느리게 부풀고 가라앉는다. 식은 scene/sceneUpdater.ts의 breathOf와 같다.
  float breath = member * sin(uTime * 6.2831853 / mix(uBreath.x, uBreath.y, aPulse) + aPulse * 31.4159265);
  // 커서가 가까이 오면 중심으로 조금 모인다
  vec3 p = aHome.xyz + (aPosition - aHome.xyz) * (1.0 + uBreath.z * breath - uAwareEffect.y * close);
  float t = uTime * (0.25 + aSeed * 0.5);
  p.xy += vec2(sin(t + aSeed * 43.0), cos(t * 0.83 + aSeed * 19.0))
    * uDrift * aBlur * (1.0 + uAwareEffect.z * sense);

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

  // 초점면에서 멀수록 번지고, 번진 만큼 옅어진다
  float confusion = clamp(abs(depth - uFocusDist) / uFocusDist, 0.0, 1.0) * aBlur;
  float core = aSize * scale;
  float size = core + confusion * uBlurPx;
  float pixels = size * uDpr;
  // 1px보다 작은 점은 깜빡이지 않도록 크기 대신 밝기를 줄인다
  float coverage = clamp(pixels, 0.0, 1.0);
  float energy = clamp((core * core) / (size * size), 0.06, 1.0);
  float twinkle = 1.0 - uTwinkle * (1.0 - aBlur) * (0.5 + 0.5 * sin(uTime * (0.5 + aSeed * 1.6) + aSeed * 90.0));
  float nearFade = smoothstep(uNear, uNear * 9.0, depth);

  // 숨 · 커서 인식 · 감싸기에 따라 아주 조금 밝아진다
  float lift = 1.0 + uBreath.w * breath + uAwareEffect.x * sense + 0.5 * wrap;

  vColor = vec4(aColor.rgb, aColor.a * energy * coverage * coverage * twinkle * nearFade * uGlow * lift);
  vSoft = confusion;
  gl_PointSize = clamp(pixels, 1.0, uMaxPoint * uDpr);
  gl_Position = toClip(screen);
}
`

export const POINT_FRAGMENT = /* glsl */ `#version 300 es
precision highp float;
in vec4 vColor;
in float vSoft;
out vec4 outColor;

void main() {
  float distanceFromCenter = length(gl_PointCoord - 0.5) * 2.0;
  // 초점이 맞은 점은 가운데가 밝고, 번진 점은 고르게 퍼진 원반이 된다
  float alpha = 1.0 - smoothstep(mix(0.0, 0.72, vSoft), 1.0, distanceFromCenter);
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
