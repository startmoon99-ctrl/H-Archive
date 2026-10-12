import { useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'

interface ChipInputProps {
  id: string
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
}

/** 태그 · 사용 기술처럼 짧은 단어 목록을 입력한다. Enter나 쉼표로 추가한다. */
export function ChipInput({ id, value, onChange, placeholder }: ChipInputProps) {
  const [draft, setDraft] = useState('')

  const commit = () => {
    const next = draft.trim().replace(/^#/, '')
    if (next && !value.includes(next)) onChange([...value, next])
    setDraft('')
  }

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // 한글 조합 중의 Enter는 글자 확정이다
    if (event.nativeEvent.isComposing) return
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault()
      commit()
    } else if (event.key === 'Backspace' && draft === '') {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="chip-input input">
      {value.map((chip) => (
        <span key={chip} className="chip">
          {chip}
          <button
            type="button"
            className="chip__remove"
            aria-label={`${chip} 지우기`}
            onClick={() => onChange(value.filter((item) => item !== chip))}
          >
            <X aria-hidden="true" />
          </button>
        </span>
      ))}
      <input
        id={id}
        className="chip-input__field"
        value={draft}
        placeholder={value.length === 0 ? placeholder : undefined}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
      />
    </div>
  )
}
