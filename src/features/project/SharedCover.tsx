import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import { projectMotion } from '@/config/motion'
import { useLatest } from '@/hooks/useLatest'
import type { PresenceState } from '@/hooks/usePresence'
import { getMotion, motionMs } from '@/motion/runtime'
import { onTick } from '@/motion/ticker'
import { locateWork, measureWork } from '@/motion/travel'
import { useUiStore, type TravelOrigin } from '@/store/uiStore'
import type { ID } from '@/types/archive'
import { clamp, lerp } from '@/utils/math'
import './shared-cover.css'

type Box = Pick<TravelOrigin, 'x' | 'y' | 'width' | 'height'>

/** 진짜 대표 이미지가 아직 준비되지 않았을 때, 이동을 마친 사본이 그 자리에서 기다려 주는 최대 시간(ms) */
const HOLD_LIMIT_MS = 1200
/** 작게 줄었을 때의 모서리 둥글기(대표 이미지 대비). 공간의 프레임은 거의 각져 있다 */
const SMALL_RADIUS_RATIO = 0.3

interface Flight {
  /** in: 상세 화면의 대표 이미지 자리로 / out: 공간의 작품 자리로 */
  direction: 'in' | 'out'
  from: Box
  /** 도착할 자리. 스크롤이나 카메라 이동으로 움직일 수 있어 매 프레임 다시 묻는다 */
  to: () => Box | null
  /** 도착 자리를 잃었을 때 쓰는 마지막 값 */
  lastTo: Box
  startedAt: number | null
  duration: number
  /** 대표 이미지의 모서리 둥글기(px) */
  radius: number
}

interface SharedCoverProps {
  projectId: ID
  state: PresenceState
  /** 상세 화면. 그 안의 [data-shared-cover]가 대표 이미지의 자리다 */
  pageRef: RefObject<HTMLElement | null>
  /** 열 때 눌렀던 자리와 거기 보이던 이미지 */
  origin: TravelOrigin | null
  /** 닫으면 이 작품이 있는 성단으로 돌아가는가 */
  returning: boolean
  /** 사본이 이동 중인 동안 true. 그동안 진짜 대표 이미지는 감춘다 */
  onFlying: (flying: boolean) => void
}

function boxOf(element: Element): Box {
  const rect = element.getBoundingClientRect()
  return { x: rect.left, y: rect.top, width: rect.width, height: rect.height }
}

/** 크기는 배율로(멀어지고 다가오는 느낌이 고르게), 위치는 직선으로 잇는다 */
function between(from: Box, to: Box, t: number): Box {
  const width = from.width * (to.width / from.width) ** t
  const height = from.height * (to.height / from.height) ** t
  return {
    x: lerp(from.x + from.width / 2, to.x + to.width / 2, t) - width / 2,
    y: lerp(from.y + from.height / 2, to.y + to.height / 2, t) - height / 2,
    width,
    height,
  }
}

/** 돌아가는 길: 진행 방향에 수직인 두 쪽 중 위쪽으로 작은 호를 그린다(시작과 끝은 그대로) */
function arc(box: Box, from: Box, to: Box, t: number): Box {
  const dx = to.x + to.width / 2 - (from.x + from.width / 2)
  const dy = to.y + to.height / 2 - (from.y + from.height / 2)
  const distance = Math.hypot(dx, dy)
  if (distance < 1) return box
  const up = dx / distance > 0 ? -1 : 1
  const { ratio, maxViewport } = projectMotion.returnArc
  const height = Math.min(Math.max(distance, (from.width - to.width) / 2) * ratio, window.innerHeight * maxViewport)
  const lift = Math.sin(Math.PI * t) * height
  return { ...box, x: box.x + (-dy / distance) * lift * up, y: box.y + (dx / distance) * lift * up }
}

/**
 * 작품의 이미지가 공간과 상세 화면 사이를 건너가는 동안 잠시 보이는 사본.
 * 열 때: 누른 프레임의 자리 → 상세 화면의 대표 이미지 자리. 닫을 때: 그 반대로, 작품이 지금 있는 자리까지.
 * 화면 구조는 건드리지 않는다. 이동하는 동안만 진짜 이미지 둘(공간의 프레임 · 대표 이미지)을 감추고 사본을 보여준다.
 * 움직임 최소화에서는 쓰지 않는다(화면은 투명도로만 바뀐다).
 */
export function SharedCover({ projectId, state, pageRef, origin, returning, onFlying }: SharedCoverProps) {
  const elementRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const flight = useRef<Flight | null>(null)
  /** 사본이 지금 그려진 자리. 이동 중에만 있다 */
  const drawn = useRef<Box | null>(null)
  const stopTick = useRef<(() => void) | null>(null)
  /** 카메라가 작품에 다가가는 동안 기다렸다가 이미지를 이어받는 타이머 */
  const handoffTimer = useRef(0)
  const wasOpen = useRef(false)
  /** 한 번 닫혔다. 그 뒤에 열리면 처음 여는 것이 아니라 남아 있던 화면을 다시 여는 것이다 */
  const hasClosed = useRef(false)
  const initialState = useRef(state)
  const latest = useLatest({ origin, returning, onFlying })

  // 아래 함수들은 ref와 인자만 읽는다. effect 안에서만 부른다.
  const actions = useRef(() => {
    const hero = () => pageRef.current?.querySelector<HTMLElement>('[data-shared-cover]') ?? null
    const heroImage = () => hero()?.querySelector('img') ?? null
    const heroBox = () => {
      const element = hero()
      return element ? boxOf(element) : null
    }
    const setAway = (id: ID | null) => useUiStore.getState().setAwayProject(id)

    /** 사본을 box 자리에 그린다. 요소의 크기는 대표 이미지와 같고, 그보다 작은 자리는 축소 + 잘라내기로 맞춘다 */
    const draw = (box: Box, size: Box, radius: number) => {
      const element = elementRef.current
      if (!element) return
      const scale = Math.max(box.width / size.width, box.height / size.height)
      const insetX = Math.max(0, (size.width - box.width / scale) / 2)
      const insetY = Math.max(0, (size.height - box.height / scale) / 2)
      const round = (radius * lerp(SMALL_RADIUS_RATIO, 1, clamp(scale, 0, 1))) / scale
      const left = box.x + box.width / 2 - size.width / 2
      const top = box.y + box.height / 2 - size.height / 2
      element.style.width = `${size.width}px`
      element.style.height = `${size.height}px`
      element.style.transform = `translate3d(${left.toFixed(2)}px, ${top.toFixed(2)}px, 0) scale(${scale.toFixed(5)})`
      element.style.clipPath = `inset(${insetY.toFixed(2)}px ${insetX.toFixed(2)}px round ${round.toFixed(2)}px)`
      drawn.current = box
    }

    /** 사본을 걷는다(CSS가 짧게 사라지게 한다) */
    const settle = () => {
      window.clearTimeout(handoffTimer.current)
      handoffTimer.current = 0
      stopTick.current?.()
      stopTick.current = null
      flight.current = null
      drawn.current = null
      if (elementRef.current) elementRef.current.dataset.flying = 'false'
    }

    /** 도착: 진짜 이미지를 먼저 되살리고 사본을 걷는다 */
    const land = (direction: Flight['direction']) => {
      settle()
      if (direction === 'in') latest.current.onFlying(false)
      else setAway(null)
    }

    const fly = (direction: Flight['direction'], from: Box, to: () => Box | null, src: string): boolean => {
      const element = elementRef.current
      const image = imageRef.current
      const target = to()
      if (!element || !image || !target) return false
      stopTick.current?.()
      if (image.getAttribute('src') !== src) image.src = src
      const preview = hero()?.querySelector('.media-preview')
      flight.current = {
        direction,
        from,
        to,
        lastTo: target,
        startedAt: null,
        // 돌아갈 때는 카메라가 물러나는 시간과 같아, 이미지와 카메라가 함께 멈춘다
        duration: motionMs(direction === 'out' ? projectMotion.approach : projectMotion.travel),
        radius: preview ? Number.parseFloat(getComputedStyle(preview).borderTopLeftRadius) || 0 : 0,
      }
      element.dataset.flying = 'true'

      const step = (_dt: number, now: number) => {
        const active = flight.current
        if (!active) return
        active.startedAt ??= now
        active.lastTo = active.to() ?? active.lastTo
        const elapsed = now - active.startedAt
        const progress = projectMotion.travelEase(clamp(elapsed / active.duration, 0, 1))
        // 사본의 기준 크기는 어느 쪽으로 가든 대표 이미지의 크기다(가장 큰 모습)
        const box = between(active.from, active.lastTo, progress)
        draw(
          active.direction === 'out' ? arc(box, active.from, active.lastTo, progress) : box,
          heroBox() ?? active.lastTo,
          active.radius,
        )
        if (elapsed < active.duration) return
        // 여는 쪽은 대표 이미지가 그려질 준비가 된 뒤에 자리를 넘긴다
        const image = active.direction === 'in' ? heroImage() : null
        const ready = !image || (image.complete && image.naturalWidth > 0)
        if (ready || elapsed >= active.duration + HOLD_LIMIT_MS) land(active.direction)
      }
      stopTick.current = onTick(step)
      step(0, performance.now())
      return true
    }

    /**
     * 열 때: 카메라가 작품으로 다가가는 동안(공간의 작품이 그대로 커진다) 기다렸다가,
     * 다 와 갈 즈음 그 작품이 보이는 자리에서 이미지를 이어받아 대표 이미지 자리로 옮긴다.
     * 이어받는 순간에만 공간의 프레임을 비우므로 두 이미지가 함께 보이지 않는다.
     */
    const handoff = (id: ID, fallback: Box, src: string) => {
      window.clearTimeout(handoffTimer.current)
      handoffTimer.current = window.setTimeout(
        () => {
          handoffTimer.current = 0
          if (fly('in', measureWork(id) ?? fallback, heroBox, src)) setAway(id)
          else latest.current.onFlying(false)
        },
        motionMs(projectMotion.approach) * projectMotion.handoffAt,
      )
    }

    return { heroBox, heroImage, setAway, settle, fly, handoff }
  }).current

  // 열 때: 화면이 처음 그려지기 전에 사본을 누른 자리에 놓고, 공간의 프레임을 비운다
  useLayoutEffect(() => {
    const { setAway, settle, handoff } = actions()
    const from = latest.current.origin
    // 대표 이미지는 사본이 도착할 때까지 감춰 둔다(처음부터 감춘 상태로 시작한다)
    if (initialState.current === 'closed' && from?.src !== undefined && getMotion().intensity > 0) {
      handoff(projectId, from, from.src)
    } else {
      latest.current.onFlying(false)
    }

    return () => {
      settle()
      if (useUiStore.getState().awayProjectId === projectId) setAway(null)
    }
  }, [actions, latest, projectId])

  useEffect(() => {
    const { heroBox, heroImage, setAway, settle, fly, handoff } = actions()

    if (state === 'open') {
      wasOpen.current = true
      // 처음 열릴 때는 위의 layout effect가 맡았다
      if (!hasClosed.current) return
      hasClosed.current = false
      // 닫힌 화면이 사라지기 전에 다시 열렸다(같은 화면을 이어 쓴다). 닫을 때 감춰 둔 대표 이미지가
      // 그대로 남지 않도록 여는 이동을 다시 한다: 돌아가던 사본이 있으면 그 자리에서, 없으면 새로 누른 자리에서.
      const returningCopy = flight.current?.direction === 'out' ? drawn.current : null
      const returningSrc = imageRef.current?.getAttribute('src')
      const origin = latest.current.origin
      const motion = getMotion().intensity > 0
      if (motion && returningCopy && returningSrc && fly('in', returningCopy, heroBox, returningSrc)) {
        setAway(projectId)
        latest.current.onFlying(true)
      } else if (motion && !returningCopy && origin?.src) {
        settle()
        latest.current.onFlying(true)
        handoff(projectId, origin, origin.src)
      } else {
        settle()
        setAway(null)
        latest.current.onFlying(false)
      }
      return
    }
    if (!wasOpen.current) return
    wasOpen.current = false
    hasClosed.current = true

    // 아직 이어받기 전에 닫혔다: 이미지는 공간의 작품에 그대로 있으니 옮길 것이 없다
    if (handoffTimer.current) {
      settle()
      setAway(null)
      return
    }

    // 닫을 때: 대표 이미지(또는 이동 중이던 사본)가 작품의 자리로 돌아간다
    const from = drawn.current ?? heroBox()
    const src = heroImage()?.currentSrc || imageRef.current?.getAttribute('src')
    const flying =
      latest.current.returning &&
      from !== null &&
      Boolean(src) &&
      getMotion().intensity > 0 &&
      fly('out', from, () => locateWork(projectId), src!)
    if (flying) {
      setAway(projectId)
      latest.current.onFlying(true)
    } else {
      settle()
      setAway(null)
    }
  }, [actions, latest, state, projectId])

  return (
    <div ref={elementRef} className="shared-cover" data-flying="false" aria-hidden="true">
      <img ref={imageRef} className="shared-cover__image" alt="" draggable={false} />
    </div>
  )
}
