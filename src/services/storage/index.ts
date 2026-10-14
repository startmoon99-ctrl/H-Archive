import { LocalArchiveRepository } from './local/localArchiveRepository'
import { LocalMediaStorage } from './local/localMediaStorage'
import { remoteConfig } from './supabase/client'
import { SupabaseArchiveRepository } from './supabase/supabaseArchiveRepository'
import { SupabaseMediaStorage } from './supabase/supabaseMediaStorage'
import type { ArchiveRepository, MediaStorage } from './types'

/**
 * 저장소를 고르는 유일한 곳.
 * 환경 변수에 Supabase 주소와 키가 있으면 원격(DB + Storage, 로그인 필요),
 * 없으면 이 브라우저의 IndexedDB를 쓴다.
 */
export const remoteEnabled = remoteConfig !== null

export const repository: ArchiveRepository = remoteEnabled
  ? new SupabaseArchiveRepository()
  : new LocalArchiveRepository()

export const mediaStorage: MediaStorage = remoteEnabled ? new SupabaseMediaStorage() : new LocalMediaStorage()
