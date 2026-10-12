import type { ReactNode } from 'react'
import './form.css'

interface FieldProps {
  label: string
  /** 연결할 입력의 id */
  htmlFor?: string
  hint?: string
  error?: string | null
  children: ReactNode
}

/** 라벨 + 입력 + 안내 문구. 입력에는 .input 클래스를 쓴다. */
export function Field({ label, htmlFor, hint, error, children }: FieldProps) {
  return (
    <div className="field">
      <label className="field__label" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {error ? (
        <p className="field__note" data-tone="error" role="alert">
          {error}
        </p>
      ) : (
        hint && <p className="field__note">{hint}</p>
      )}
    </div>
  )
}

/** 나란히 놓는 필드 묶음 */
export function FieldRow({ children }: { children: ReactNode }) {
  return <div className="field-row">{children}</div>
}
