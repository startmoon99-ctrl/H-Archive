import { create } from 'zustand'
import { authService } from '@/services/authService'

/**
 * local: 로그인 없이 이 브라우저에 저장 / checking: 로그인 여부 확인 중
 * signed-out: 로그인 필요 / signed-in: 원격 저장소 사용 중
 */
export type SessionStatus = 'local' | 'checking' | 'signed-out' | 'signed-in'

interface SessionState {
  status: SessionStatus
  email: string | null
  init: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const useSessionStore = create<SessionState>((set) => ({
  status: authService.required ? 'checking' : 'local',
  email: null,

  async init() {
    if (!authService.required) return
    try {
      const session = await authService.current()
      set(session ? { status: 'signed-in', email: session.email } : { status: 'signed-out', email: null })
    } catch {
      set({ status: 'signed-out', email: null })
    }
  },

  async signIn(email, password) {
    const session = await authService.signIn(email, password)
    set({ status: 'signed-in', email: session.email })
  },

  async signOut() {
    await authService.signOut()
    // 메모리에 남은 기록과 파일 주소를 모두 버리기 위해 새로 시작한다
    window.location.assign('/')
  },
}))

/** 기록을 불러와도 되는 상태인가 */
export function canLoadArchive(status: SessionStatus): boolean {
  return status === 'local' || status === 'signed-in'
}
