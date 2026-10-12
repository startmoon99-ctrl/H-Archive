import { useEffect, useState } from 'react'
import { useArchiveNav } from '@/app/useArchiveRoute'
import { ConfirmButton } from '@/components/form/ConfirmButton'
import { archiveService } from '@/services/archiveService'
import type { StorageEstimate } from '@/services/storage/types'
import { useArchiveStore } from '@/store/archiveStore'
import { useUiStore } from '@/store/uiStore'
import { formatBytes } from '@/utils/format'

/** 지금 이 브라우저에 무엇이 얼마나 들어 있는지, 그리고 전부 비우기 */
export function DataSettings({ onClose }: { onClose: () => void }) {
  const nav = useArchiveNav()
  const categoryCount = useArchiveStore((state) => state.categories.length)
  const projectCount = useArchiveStore((state) => state.projects.length)
  const [estimate, setEstimate] = useState<StorageEstimate | null>(null)

  useEffect(() => {
    void archiveService.estimateStorage().then(setEstimate)
  }, [projectCount])

  const clear = async () => {
    await useArchiveStore.getState().clearAll()
    useUiStore.getState().notify('은하를 비웠습니다. 이제 첫 창작물을 추가해 보세요.')
    onClose()
    nav.toGalaxy()
  }

  return (
    <section className="settings__section" aria-labelledby="settings-data">
      <h3 id="settings-data" className="eyebrow">
        Data
      </h3>
      <p className="settings__text">
        항성계 {categoryCount}개 · 창작물 {projectCount}개
        {estimate && ` · ${formatBytes(estimate.usage)} 사용 (가능 ${formatBytes(estimate.quota)})`}
      </p>
      <p className="settings__text" data-tone="faint">
        기록과 파일은 지금 이 브라우저에만 저장됩니다. 다른 기기나 다른 주소와는 공유되지 않습니다.
      </p>
      <ConfirmButton
        label="모든 기록 지우고 빈 은하로 시작"
        confirmLabel="되돌릴 수 없습니다. 한 번 더 누르면 지워집니다"
        onConfirm={() => void clear()}
        disabled={categoryCount + projectCount === 0}
      />
    </section>
  )
}
