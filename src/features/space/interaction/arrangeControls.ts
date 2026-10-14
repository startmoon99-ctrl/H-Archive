import type { ID } from '@/types/archive'
import { project, screenToDepthPlane, type Projected } from '../camera/cameraView'
import type { Arrangement, Vec3 } from '../scene/arrangement'

export interface ArrangeOptions {
  /** 그 성단이 지금 보이는 자리(world) */
  positionOf: (id: ID) => Vec3 | null
  /** 놓은 자리를 저장한다 */
  onDrop: (id: ID, at: Vec3) => void
}

/**
 * 성단 위치 조절의 입력: 성단을 눌러 끌면 그 성단이 손을 따라온다(마우스 · 터치 같음).
 * 성단은 카메라에서 잡은 순간의 거리를 지킨 채 화면과 나란한 면 위로 움직인다. 시점을 돌려 놓고 끌면 앞뒤로도 옮겨진다.
 * 빈 곳을 끌거나 확대하는 조작은 그대로 pointer · touch 조작이 받는다(성단을 잡은 입력만 여기서 가로챈다).
 * 들어 올린 모습은 data-held를 받아 effects/cluster-effects.css가 그린다.
 */
export function attachArrangeControls(stage: HTMLElement, arrangement: Arrangement, options: ArrangeOptions): () => void {
  const projected: Projected = { x: 0, y: 0, scale: 1, depth: 1 }
  let pointerId: number | null = null
  let heldId: ID | null = null
  let heldElement: HTMLElement | null = null
  /** 누른 지점에서 성단 중심까지(px). 잡은 자리가 손가락 밑에 그대로 있게 한다 */
  let grabX = 0
  let grabY = 0
  let depth = 1

  const follow = (event: PointerEvent) => {
    arrangement.moveTo(screenToDepthPlane({ x: event.clientX + grabX, y: event.clientY + grabY }, depth))
  }

  const onDown = (event: PointerEvent) => {
    if (pointerId !== null || (event.pointerType === 'mouse' && event.button !== 0)) return
    const element = (event.target as Element | null)?.closest<HTMLElement>('.cluster__hit')?.closest<HTMLElement>('.cluster')
    const id = element?.dataset.id
    const at = id ? options.positionOf(id) : null
    if (!element || !id || !at || !project(at.x, at.y, at.z, projected)) return
    // 공간을 돌리는 조작으로 넘어가지 않게 여기서 멈춘다
    event.stopPropagation()
    event.preventDefault()
    pointerId = event.pointerId
    heldId = id
    heldElement = element
    grabX = projected.x - event.clientX
    grabY = projected.y - event.clientY
    depth = projected.depth
    arrangement.hold(id, at)
    stage.setPointerCapture(event.pointerId)
    element.dataset.held = 'true'
    stage.dataset.holding = 'true'
  }

  const onMove = (event: PointerEvent) => {
    if (event.pointerId !== pointerId) return
    event.stopPropagation()
    follow(event)
  }

  const finish = (event: PointerEvent, keep: boolean) => {
    if (event.pointerId !== pointerId) return
    event.stopPropagation()
    if (keep) follow(event)
    const at = arrangement.release()
    if (keep && heldId && at) options.onDrop(heldId, at)
    if (heldElement) delete heldElement.dataset.held
    delete stage.dataset.holding
    pointerId = null
    heldId = null
    heldElement = null
  }
  const onUp = (event: PointerEvent) => finish(event, true)
  const onCancel = (event: PointerEvent) => finish(event, false)

  // 다른 조작보다 먼저 받도록 capture 단계에서 듣는다
  stage.addEventListener('pointerdown', onDown, true)
  stage.addEventListener('pointermove', onMove, true)
  stage.addEventListener('pointerup', onUp, true)
  stage.addEventListener('pointercancel', onCancel, true)
  return () => {
    if (heldElement) delete heldElement.dataset.held
    delete stage.dataset.holding
    if (pointerId !== null) arrangement.release()
    stage.removeEventListener('pointerdown', onDown, true)
    stage.removeEventListener('pointermove', onMove, true)
    stage.removeEventListener('pointerup', onUp, true)
    stage.removeEventListener('pointercancel', onCancel, true)
  }
}
