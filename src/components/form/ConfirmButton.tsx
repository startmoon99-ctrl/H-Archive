import { useEffect, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '../Button'

const CONFIRM_WINDOW_MS = 4000

interface ConfirmButtonProps {
  label: string
  confirmLabel: string
  onConfirm: () => void
  disabled?: boolean
}

/** 되돌릴 수 없는 동작용. 한 번 누르면 확인 문구로 바뀌고, 다시 눌러야 실행된다. */
export function ConfirmButton({ label, confirmLabel, onConfirm, disabled }: ConfirmButtonProps) {
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!armed) return
    const timer = window.setTimeout(() => setArmed(false), CONFIRM_WINDOW_MS)
    return () => window.clearTimeout(timer)
  }, [armed])

  return (
    <Button
      icon={Trash2}
      variant={armed ? 'danger' : 'quiet'}
      size="sm"
      disabled={disabled}
      onClick={() => (armed ? onConfirm() : setArmed(true))}
    >
      {armed ? confirmLabel : label}
    </Button>
  )
}
