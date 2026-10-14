import { remoteEnabled } from './storage'
import { currentUser, supabase } from './storage/supabase/client'

export interface AuthSession {
  email: string
}

/**
 * 로그인. 원격 저장소를 쓸 때만 의미가 있다(브라우저 저장은 로그인 없이 쓴다).
 * 계정은 앱에서 만들지 않는다. Supabase 대시보드에서 본인 계정 하나만 만들어 쓴다.
 */
export const authService = {
  /** false면 로그인 없이 이 브라우저에 저장한다 */
  required: remoteEnabled,

  async current(): Promise<AuthSession | null> {
    const user = await currentUser()
    return user ? { email: user.email } : null
  },

  async signIn(email: string, password: string): Promise<AuthSession> {
    const { data, error } = await supabase().auth.signInWithPassword({ email, password })
    if (error || !data.user) throw new Error('이메일 또는 비밀번호가 맞지 않습니다.')
    return { email: data.user.email ?? email }
  },

  async signOut(): Promise<void> {
    await supabase().auth.signOut()
  },
}
