import { create } from 'zustand'
import { LIMITS } from '@/config/app'
import type { ID } from '@/types/archive'
import type { DialogDescriptor, IntroPhase, Toast } from '@/types/ui'
import { createId } from '@/utils/id'

/** 프로젝트로 들어갈 때 눌렀던 프레임의 화면 위치(px). 상세 화면이 이 자리에서 커지며 열린다. */
export interface TravelOrigin {
  x: number
  y: number
  width: number
  height: number
  /** 그 자리에 보이던 이미지의 주소. 있으면 같은 이미지가 상세 화면의 대표 이미지 자리까지 이어서 이동한다. */
  src?: string
}

interface UiState {
  dialog: DialogDescriptor | null
  dialogId: number
  /**
   * 추가 폼에 올라와 있는 파일. Drag & Drop은 폼이 열려 있는 중에도 일어나므로
   * 폼 안이 아니라 여기에 두고, 창이 닫히면 비운다.
   */
  stagedFiles: File[]
  introPhase: IntroPhase
  /** 다시 보기를 누를 때마다 늘어나 Intro를 새로 시작시킨다 */
  introRun: number
  /** 인트로가 끝난 뒤 카메라가 공간으로 다가오는 시간(ms) */
  introRevealMs: number
  isDraggingFiles: boolean
  travelOrigin: TravelOrigin | null
  /** 이미지가 상세 화면으로 건너가 있어 공간에서는 프레임을 비워 둔 작품 */
  awayProjectId: ID | null
  /** 방금 만들어져 등장 애니메이션을 보여줄 프로젝트 */
  bornProjectId: ID | null
  toasts: Toast[]

  openDialog: (dialog: DialogDescriptor) => void
  closeDialog: (expectedId?: number) => boolean
  stageFiles: (files: File[]) => void
  setStagedFiles: (files: File[]) => void
  startReveal: (revealMs: number) => void
  finishIntro: () => void
  replayIntro: () => void
  setDraggingFiles: (dragging: boolean) => void
  setTravelOrigin: (origin: TravelOrigin | null) => void
  setAwayProject: (id: ID | null) => void
  setBornProject: (id: ID | null) => void
  notify: (message: string, tone?: Toast['tone'], action?: Toast['action']) => void
  dismissToast: (id: ID) => void
}

export const useUiStore = create<UiState>((set, get) => ({
  dialog: null,
  dialogId: 0,
  stagedFiles: [],
  introPhase: 'playing',
  introRun: 0,
  introRevealMs: 0,
  isDraggingFiles: false,
  travelOrigin: null,
  awayProjectId: null,
  bornProjectId: null,
  toasts: [],

  openDialog: (dialog) => set((state) => ({ dialog, dialogId: state.dialogId + 1 })),
  closeDialog: (expectedId) => {
    const state = get()
    if (!state.dialog || (expectedId !== undefined && expectedId !== state.dialogId)) return false
    set({ dialog: null, stagedFiles: [] })
    return true
  },
  stageFiles: (files) => set((state) => ({ stagedFiles: [...state.stagedFiles, ...files] })),
  setStagedFiles: (stagedFiles) => set({ stagedFiles }),
  startReveal: (introRevealMs) => set({ introPhase: 'revealing', introRevealMs }),
  finishIntro: () => set({ introPhase: 'done' }),
  replayIntro: () =>
    set((state) => ({ dialog: null, stagedFiles: [], introPhase: 'playing', introRun: state.introRun + 1 })),
  setDraggingFiles: (isDraggingFiles) => set({ isDraggingFiles }),
  setTravelOrigin: (travelOrigin) => set({ travelOrigin }),
  setAwayProject: (awayProjectId) => set({ awayProjectId }),
  setBornProject: (bornProjectId) => set({ bornProjectId }),

  notify: (message, tone = 'info', action) => {
    const id = createId()
    set((state) => ({ toasts: [...state.toasts, { id, message, tone, action }] }))
    // 눌러야 하는 알림은 스스로 사라지지 않는다
    if (!action) window.setTimeout(() => get().dismissToast(id), LIMITS.toastMs)
  },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}))
