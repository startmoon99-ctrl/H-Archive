/**
 * 마우스 위치의 공유 상태. 시차 · 커서 빛 · 입자 반응이 React 렌더 없이 읽는다.
 * 터치 입력은 기록하지 않는다(모바일은 Hover 기반 효과를 쓰지 않는다).
 */
export const pointer = {
  x: 0,
  y: 0,
  /** 화면 중심 기준 -1 ~ 1 */
  nx: 0,
  ny: 0,
  active: false,
}

window.addEventListener(
  'pointermove',
  (event) => {
    if (event.pointerType === 'touch') return
    pointer.x = event.clientX
    pointer.y = event.clientY
    pointer.nx = (event.clientX / window.innerWidth) * 2 - 1
    pointer.ny = (event.clientY / window.innerHeight) * 2 - 1
    pointer.active = true
  },
  { passive: true },
)

document.documentElement.addEventListener('pointerleave', () => {
  pointer.active = false
})
