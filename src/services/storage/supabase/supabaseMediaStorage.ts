import * as tus from 'tus-js-client'
import { REMOTE } from '@/config/app'
import { StorageError, StorageQuotaError, type MediaStorage, type PutOptions, type StorageEstimate } from '../types'
import { remoteConfig, requireUser, supabase, throwIfError, type RemoteUser } from './client'

interface SignedUrl {
  url: string
  expiresAt: number
}

/** 요금제의 파일 크기 · 용량 한도에 걸렸을 때의 응답 */
function isQuotaMessage(message: string): boolean {
  return /413|exceeded|too large|quota/i.test(message)
}

function toStorageError(message: string): StorageError {
  return isQuotaMessage(message)
    ? new StorageQuotaError('파일이 저장소의 업로드 한도를 넘습니다.')
    : new StorageError(message)
}

/**
 * Supabase Storage 구현체. 파일은 비공개 버킷의 "사용자 id/…" 아래에 두고
 * 화면에는 일정 시간만 유효한 서명된 주소를 내준다.
 * 큰 파일은 브라우저에서 Storage로 직접, 끊겨도 이어 올리는 방식(TUS)으로 보낸다.
 */
export class SupabaseMediaStorage implements MediaStorage {
  private urls = new Map<string, SignedUrl>()

  private bucket() {
    return supabase().storage.from(REMOTE.bucket)
  }

  private path(user: RemoteUser, key: string): string {
    return `${user.id}/${key}`
  }

  async put(key: string, blob: Blob, options: PutOptions = {}): Promise<void> {
    const user = await requireUser()
    const path = this.path(user, key)
    this.urls.delete(key)

    if (blob.size > REMOTE.resumableThresholdBytes) {
      await this.putResumable(user, path, blob, options)
      return
    }
    const { error } = await this.bucket().upload(path, blob, {
      upsert: true,
      contentType: blob.type || undefined,
    })
    if (error) throw toStorageError(error.message)
    options.onProgress?.(1)
  }

  private putResumable(user: RemoteUser, path: string, blob: Blob, { onProgress, signal }: PutOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      const upload = new tus.Upload(blob, {
        endpoint: `${remoteConfig?.url}/storage/v1/upload/resumable`,
        retryDelays: [...REMOTE.resumableRetryDelaysMs],
        chunkSize: REMOTE.resumableChunkBytes,
        headers: { authorization: `Bearer ${user.accessToken}`, 'x-upsert': 'true' },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        metadata: {
          bucketName: REMOTE.bucket,
          objectName: path,
          contentType: blob.type || 'application/octet-stream',
        },
        onProgress: (sent, total) => onProgress?.(total > 0 ? sent / total : 0),
        onSuccess: () => resolve(),
        onError: (error) => reject(toStorageError(error.message)),
      })
      signal?.addEventListener('abort', () => {
        void upload.abort()
        reject(new StorageError('업로드를 중단했습니다.'))
      })
      // 같은 파일을 올리다 끊긴 적이 있으면 그 지점부터 이어서 보낸다
      void upload.findPreviousUploads().then((previous) => {
        if (previous.length > 0) upload.resumeFromPreviousUpload(previous[0])
        upload.start()
      })
    })
  }

  async getBlob(key: string): Promise<Blob | undefined> {
    const user = await requireUser()
    const { data, error } = await this.bucket().download(this.path(user, key))
    if (error) return undefined
    return data
  }

  async getUrl(key: string): Promise<string | undefined> {
    const cached = this.urls.get(key)
    if (cached && cached.expiresAt - REMOTE.signedUrlRefreshSeconds * 1000 > Date.now()) return cached.url

    const user = await requireUser()
    const { data, error } = await this.bucket().createSignedUrl(this.path(user, key), REMOTE.signedUrlSeconds)
    if (error || !data) return undefined
    this.urls.set(key, { url: data.signedUrl, expiresAt: Date.now() + REMOTE.signedUrlSeconds * 1000 })
    return data.signedUrl
  }

  async remove(keys: string[]): Promise<void> {
    if (keys.length === 0) return
    const user = await requireUser()
    for (const key of keys) this.urls.delete(key)
    const { error } = await this.bucket().remove(keys.map((key) => this.path(user, key)))
    throwIfError(error)
  }

  /** 내 폴더 아래의 모든 파일을 지운다. 폴더는 "프로젝트 / 미디어 / 파일" 3단이다. */
  async clear(): Promise<void> {
    const user = await requireUser()
    this.urls.clear()
    const files = await this.listFiles(user.id)
    if (files.length === 0) return
    const { error } = await this.bucket().remove(files)
    throwIfError(error)
  }

  private async listFiles(folder: string): Promise<string[]> {
    const { data, error } = await this.bucket().list(folder)
    throwIfError(error)
    const nested = await Promise.all(
      (data ?? []).map((entry) => {
        const path = `${folder}/${entry.name}`
        // 폴더는 id가 없는 항목으로 온다
        return entry.id ? Promise.resolve([path]) : this.listFiles(path)
      }),
    )
    return nested.flat()
  }

  /** 원격 저장소의 사용량은 대시보드에서 확인한다 */
  async estimate(): Promise<StorageEstimate | null> {
    return null
  }
}
