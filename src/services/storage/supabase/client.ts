import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { StorageError } from '../types'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

/** 주소와 키가 모두 있어야 원격 저장소를 쓴다. 하나라도 없으면 null. */
export const remoteConfig = url && key ? { url, key } : null

let client: SupabaseClient | null = null

export function supabase(): SupabaseClient {
  if (!remoteConfig) throw new StorageError('원격 저장소가 설정되어 있지 않습니다.')
  client ??= createClient(remoteConfig.url, remoteConfig.key)
  return client
}

export interface RemoteUser {
  id: string
  email: string
  accessToken: string
}

/** 지금 로그인한 사용자. 없으면 null. */
export async function currentUser(): Promise<RemoteUser | null> {
  const { data } = await supabase().auth.getSession()
  const session = data.session
  if (!session) return null
  return { id: session.user.id, email: session.user.email ?? '', accessToken: session.access_token }
}

export async function requireUser(): Promise<RemoteUser> {
  const user = await currentUser()
  if (!user) throw new StorageError('로그인이 필요합니다.')
  return user
}

/** Supabase가 돌려준 오류를 저장소 오류로 바꿔 던진다. */
export function throwIfError(error: { message: string } | null): void {
  if (error) throw new StorageError(error.message)
}
