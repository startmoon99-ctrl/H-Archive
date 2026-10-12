import { useEffect, useState } from 'react'
import { archiveService } from '@/services/archiveService'
import type { MediaSource } from '@/types/archive'

/**
 * 미디어 위치를 화면에서 쓸 주소로 바꾼다.
 * source를 undefined로 주면 아무것도 불러오지 않으므로, 지연 로딩은 호출하는 쪽이 source를 늦게 넘겨서 한다.
 */
export function useMediaUrl(source: MediaSource | undefined): string | undefined {
  const direct = source?.type === 'url' ? source.url : undefined
  const key = source?.type === 'stored' ? source.key : undefined
  const [resolved, setResolved] = useState<{ key: string; url: string }>()

  useEffect(() => {
    if (!key) return
    let cancelled = false
    void archiveService.resolveMediaUrl({ type: 'stored', key }).then((url) => {
      if (!cancelled && url) setResolved({ key, url })
    })
    return () => {
      cancelled = true
    }
  }, [key])

  return direct ?? (resolved?.key === key ? resolved?.url : undefined)
}
