import { useEffect, useState } from 'react'
import { LogOut } from 'lucide-react'
import { useArchiveNav } from '@/app/useArchiveRoute'
import { Button } from '@/components/Button'
import { ConfirmButton } from '@/components/form/ConfirmButton'
import { archiveService } from '@/services/archiveService'
import type { StorageEstimate } from '@/services/storage/types'
import { useArchiveStore } from '@/store/archiveStore'
import { useSessionStore } from '@/store/sessionStore'
import { useUiStore } from '@/store/uiStore'
import { formatBytes } from '@/utils/format'

/** 기록이 어디에 얼마나 들어 있는지, 로그아웃, 그리고 전부 비우기 */
export function DataSettings({ onClose }: { onClose: () => void }) {
  const nav = useArchiveNav()
  const categoryCount = useArchiveStore((state) => state.categories.length)
  const projectCount = useArchiveStore((state) => state.projects.length)
  const remote = useSessionStore((state) => state.status === 'signed-in')
  const email = useSessionStore((state) => state.email)
  const signOut = useSessionStore((state) => state.signOut)
  const [estimate, setEstimate] = useState<StorageEstimate | null>(null)

  useEffect(() => {
    void archiveService.estimateStorage().then(setEstimate)
  }, [projectCount])

  const clear = async () => {
    await useArchiveStore.getState().clearAll()
    useUiStore.getState().notify('공간을 비웠습니다. 이제 첫 창작물을 추가해 보세요.')
    onClose()
    nav.toGalaxy()
  }

  return (
    <section className="settings__section" aria-labelledby="settings-data">
      <h3 id="settings-data" className="eyebrow">
        Data
      </h3>
      <p className="settings__text">
        성단 {categoryCount}개 · 창작물 {projectCount}개
        {estimate && ` · ${formatBytes(estimate.usage)} 사용 (가능 ${formatBytes(estimate.quota)})`}
      </p>
      <p className="settings__text" data-tone="faint">
        {remote
          ? `기록과 파일은 내 계정(${email})의 원격 저장소에 있습니다. 같은 계정으로 로그인한 기기에서 함께 보입니다.`
          : '기록과 파일은 지금 이 브라우저에만 저장됩니다. 다른 기기나 다른 주소와는 공유되지 않습니다.'}
      </p>
      {remote && (
        <Button icon={LogOut} variant="ghost" size="sm" onClick={() => void signOut()}>
          로그아웃
        </Button>
      )}
      <ConfirmButton
        label="모든 기록 지우고 빈 공간으로 시작"
        confirmLabel="되돌릴 수 없습니다. 한 번 더 누르면 지워집니다"
        onConfirm={() => void clear()}
        disabled={categoryCount + projectCount === 0}
      />
    </section>
  )
}
