import { STAR_HUES } from '@/config/catalog'
import { cssVars } from '@/utils/css'

interface HuePickerProps {
  id: string
  value: number
  onChange: (hue: number) => void
}

/** 성단의 색. 준비된 색을 고르거나 슬라이더로 직접 정한다. */
export function HuePicker({ id, value, onChange }: HuePickerProps) {
  return (
    <div className="hue-picker">
      <div className="hue-picker__swatches" role="group" aria-label="준비된 색">
        {STAR_HUES.map((option) => (
          <button
            key={option.id}
            type="button"
            className="hue-picker__swatch"
            style={cssVars({ hue: option.hue })}
            aria-label={option.label}
            aria-pressed={value === option.hue}
            onClick={() => onChange(option.hue)}
          />
        ))}
      </div>
      <input
        id={id}
        className="hue-picker__range"
        type="range"
        min={0}
        max={359}
        value={value}
        style={cssVars({ hue: value })}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </div>
  )
}
