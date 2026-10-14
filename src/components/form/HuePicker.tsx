import { useRef, type PointerEvent } from 'react'
import { STAR_HUES } from '@/config/catalog'
import { cssVars } from '@/utils/css'

interface HuePickerProps {
  id: string
  value: number
  onChange: (hue: number) => void
}

/** 이 각도 안이면 준비된 색의 이름으로 읽어 준다 */
const NAMED_WITHIN_DEG = 12

/** 화면의 한 점이 바퀴 중심에서 어느 방향인가(12시 = 0, 시계 방향) */
function hueAt(wheel: HTMLElement, clientX: number, clientY: number): number {
  const rect = wheel.getBoundingClientRect()
  const dx = clientX - (rect.left + rect.width / 2)
  const dy = clientY - (rect.top + rect.height / 2)
  const deg = (Math.atan2(dx, -dy) * 180) / Math.PI
  return Math.round((deg + 360) % 360) % 360
}

function nameOf(hue: number): string {
  const near = STAR_HUES.find((option) => {
    const gap = Math.abs(option.hue - hue) % 360
    return Math.min(gap, 360 - gap) <= NAMED_WITHIN_DEG
  })
  return near ? `${near.label} (${hue}°)` : `${hue}°`
}

/**
 * 성단의 색. 색상환을 누르거나 끌어 방향으로 고른다(저장하는 값은 hue 하나다).
 * 가운데의 빛이 고른 색을 보여준다. 키보드와 화면 낭독기는 숨겨 둔 range 입력으로 같은 값을 다룬다.
 */
export function HuePicker({ id, value, onChange }: HuePickerProps) {
  const wheelRef = useRef<HTMLDivElement>(null)

  const pick = (event: PointerEvent<HTMLDivElement>) => {
    if (wheelRef.current) onChange(hueAt(wheelRef.current, event.clientX, event.clientY))
  }

  return (
    <div className="hue-picker" style={cssVars({ hue: value })}>
      <input
        id={id}
        className="hue-picker__input visually-hidden"
        type="range"
        min={0}
        max={359}
        value={value}
        aria-valuetext={nameOf(value)}
        onChange={(event) => onChange(Number(event.target.value))}
      />
      <div
        ref={wheelRef}
        className="hue-picker__wheel"
        aria-hidden="true"
        onPointerDown={(event) => {
          event.preventDefault()
          event.currentTarget.setPointerCapture(event.pointerId)
          // 키보드로도 이어서 조절할 수 있게 숨은 입력에 초점을 둔다
          document.getElementById(id)?.focus({ preventScroll: true })
          pick(event)
        }}
        onPointerMove={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) pick(event)
        }}
      >
        <span className="hue-picker__ring" />
        <span className="hue-picker__arm">
          <span className="hue-picker__knob" />
        </span>
        <span className="hue-picker__orb" />
      </div>
    </div>
  )
}
