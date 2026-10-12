import { create } from 'zustand'
import { LIMITS } from '@/config/app'
import type { ID } from '@/types/archive'
import type { DialogDescriptor, IntroPhase, Point, Toast } from '@/types/ui'
import { createId } from '@/utils/id'

/** 프로젝트로 들어갈 때의 출발점. 화면 좌표는 전환 효과에, world 좌표는 카메라 이동에 쓴다. */
export interface TravelOrigin {
  screen: Point
  world: Point
}

interface UiState {
  dialog: DialogDescriptor | null
  /**
   * 추가 폼에 올라와 있는 파일. Drag & Drop은 폼이 열려 있는 중에도 일어나므로
   * 폼 안이 아니라 여기에 두고, 창이 닫히면 비운다.
   */
  stagedFiles: File[]
  introPhase: IntroPhase
  /** 다시 보기를 누를 때마다 늘어나 Intro를 새로 시작시킨다 */
  introRun: number
  /** 인트로가 끝난 뒤 카메라가 은하로 다가오는 시간(ms) */
  introRevealMs: number
  isDraggingFiles: boolean
  travelOrigin: TravelOrigin | null
  /** 방금 만들어져 등장 애니메이션을 보여줄 프로젝트 */
  bornProjectId: ID | null
  toasts: Toast[]

  openDialog: (dialog: DialogDescriptor) => void
  closeDialog: () => void
  stageFiles: (files: File[]) => void
  setStagedFiles: (files: File[]) => void
  startReveal: (revealMs: number) => void
  finishIntro: () => void
  replayIntro: () => void
  setDraggingFiles: (dragging: boolean) => void
  setTravelOrigin: (origin: TravelOrigin | null) => void
  setBornProject: (id: ID | null) => void
  notify: (message: string, tone?: Toast['tone']) => void
  dismissToast: (id: ID) => void
}

export const useUiStore = create<UiState>((set, get) => ({
  dialog: null,
  stagedFiles: [],
  introPhase: 'playing',
  introRun: 0,
  introRevealMs: 0,
  isDraggingFiles: false,
  travelOrigin: null,
  bornProjectId: null,
  toasts: [],

  openDialog: (dialog) => set({ dialog }),
  closeDialog: () => set({ dialog: null, stagedFiles: [] }),
  stageFiles: (files) => set((state) => ({ stagedFiles: [...state.stagedFiles, ...files] })),
  setStagedFiles: (stagedFiles) => set({ stagedFiles }),
  startReveal: (introRevealMs) => set({ introPhase: 'revealing', introRevealMs }),
  finishIntro: () => set({ introPhase: 'done' }),
  replayIntro: () =>
    set((state) => ({ dialog: null, stagedFiles: [], introPhase: 'playing', introRun: state.introRun + 1 })),
  setDraggingFiles: (isDraggingFiles) => set({ isDraggingFiles }),
  setTravelOrigin: (travelOrigin) => set({ travelOrigin }),
  setBornProject: (bornProjectId) => set({ bornProjectId }),

  notify: (message, tone = 'info') => {
    const id = createId()
    set((state) => ({ toasts: [...state.toasts, { id, message, tone }] }))
    window.setTimeout(() => get().dismissToast(id), LIMITS.toastMs)
  },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}))
