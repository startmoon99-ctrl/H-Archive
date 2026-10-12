import { createPortal } from 'react-dom';
import { useToastStore } from '@/store/toastStore';
import './Toaster.css';

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);
  const dismiss = useToastStore((state) => state.dismiss);

  return createPortal(
    <div className="toaster" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <button key={toast.id} type="button" className="toast" data-tone={toast.tone} onClick={() => dismiss(toast.id)}>
          {toast.message}
        </button>
      ))}
    </div>,
    document.body,
  );
}
