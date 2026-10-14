import { useUiStore } from '@/store/uiStore'
import './toaster.css'

/** 저장 결과처럼 잠깐 알려야 하는 일 */
export function Toaster() {
  const toasts = useUiStore((state) => state.toasts)
  const dismiss = useUiStore((state) => state.dismissToast)
  return (
    <div className="toaster" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <button
          key={toast.id}
          type="button"
          className="toast"
          data-tone={toast.tone}
          onClick={() => {
            dismiss(toast.id)
            toast.action?.()
          }}
        >
          {toast.message}
        </button>
      ))}
    </div>
  )
}
