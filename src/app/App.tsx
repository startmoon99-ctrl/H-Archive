import { useEffect } from 'react'
import { Toaster } from '@/components/Toaster'
import { DialogHost } from '@/features/dialogs/DialogHost'
import { Galaxy } from '@/features/galaxy/Galaxy'
import { Hud } from '@/features/hud/Hud'
import { Intro } from '@/features/intro/Intro'
import { ProjectLayer } from '@/features/project/ProjectLayer'
import { UploadDropzone } from '@/features/upload/UploadDropzone'
import { CursorGlow } from '@/motion/CursorGlow'
import { useArchiveStore } from '@/store/archiveStore'
import { useUiStore } from '@/store/uiStore'
import { useGlobalHotkeys } from './useGlobalHotkeys'

/**
 * 화면의 층(아래 → 위): 은하 → 프로젝트 상세 → HUD → Drop Zone → 대화상자 → 알림 → 인트로 → 커서 빛.
 * 은하는 항상 떠 있고, 어느 층이 보이는지는 주소와 uiStore가 정한다.
 */
export function App() {
  const init = useArchiveStore((state) => state.init)
  const error = useArchiveStore((state) => state.error)
  useGlobalHotkeys()

  useEffect(() => {
    void init()
  }, [init])

  useEffect(() => {
    if (error) useUiStore.getState().notify(`기록을 불러오지 못했습니다. ${error}`, 'warning')
  }, [error])

  return (
    <>
      <Galaxy />
      <ProjectLayer />
      <Hud />
      <UploadDropzone />
      <DialogHost />
      <Toaster />
      <Intro />
      <CursorGlow />
    </>
  )
}
