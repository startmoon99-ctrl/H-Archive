import { LocalArchiveRepository } from './local/localArchiveRepository'
import { LocalMediaStorage } from './local/localMediaStorage'
import type { ArchiveRepository, MediaStorage } from './types'

/** 저장소를 바꿀 때 고치는 유일한 곳. */
export const repository: ArchiveRepository = new LocalArchiveRepository()
export const mediaStorage: MediaStorage = new LocalMediaStorage()
