import { create } from 'zustand';
import { TOAST_DURATION } from '@/config/app';

export type ToastTone = 'info' | 'error';

export interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastState {
  toasts: Toast[];
  push(message: string, tone?: ToastTone): void;
  dismiss(id: number): void;
}

let nextId = 1;

export const useToastStore = create<ToastState>((set, get) => ({
  toasts: [],
  push(message, tone = 'info') {
    const id = nextId++;
    set((state) => ({ toasts: [...state.toasts, { id, message, tone }] }));
    setTimeout(() => get().dismiss(id), TOAST_DURATION);
  },
  dismiss(id) {
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
  },
}));

export const toast = (message: string, tone?: ToastTone) => useToastStore.getState().push(message, tone);
