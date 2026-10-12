import type { ReactNode } from 'react'
import { Button } from '@/components/Button'
import { DialogBody, DialogFooter } from '@/components/Dialog'
import './form-shell.css'

interface FormShellProps {
  onSubmit: () => void
  onCancel: () => void
  /** 저장 중일 때의 진행 문구 */
  busy: string | null
  error: string | null
  submitLabel: string
  /** 삭제처럼 왼쪽에 따로 놓는 동작 */
  aside?: ReactNode
  children: ReactNode
}

/** 추가 · 편집 폼의 공통 뼈대: 스크롤되는 입력 영역 + 고정된 하단 버튼 */
export function FormShell({ onSubmit, onCancel, busy, error, submitLabel, aside, children }: FormShellProps) {
  return (
    <form
      className="form-shell"
      onSubmit={(event) => {
        event.preventDefault()
        if (!busy) onSubmit()
      }}
    >
      <DialogBody>{children}</DialogBody>
      <DialogFooter>
        {aside}
        <p className="form-shell__status" data-tone={error ? 'error' : 'info'} role="status">
          {error ?? busy}
        </p>
        <Button variant="quiet" onClick={onCancel}>
          취소
        </Button>
        <Button type="submit" variant="primary" disabled={busy !== null}>
          {submitLabel}
        </Button>
      </DialogFooter>
    </form>
  )
}
