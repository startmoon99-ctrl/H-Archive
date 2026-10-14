import { useEffect } from 'react'
import { Toaster } from '@/components/Toaster'
import { SignInGate } from '@/features/auth/SignInGate'
import { DialogHost } from '@/features/dialogs/DialogHost'
import { Space } from '@/features/space/Space'
import { Hud } from '@/features/hud/Hud'
import { Intro } from '@/features/intro/Intro'
import { ProjectLayer } from '@/features/project/ProjectLayer'
import { UploadDropzone } from '@/features/upload/UploadDropzone'
import { CursorGlow } from '@/motion/CursorGlow'
import { useArchiveStore } from '@/store/archiveStore'
import { canLoadArchive, useSessionStore } from '@/store/sessionStore'
import { useUiStore } from '@/store/uiStore'
import { useGlobalHotkeys } from './useGlobalHotkeys'

/**
 * 화면의 층(아래 → 위): 공간 → 프로젝트 상세 → HUD → Drop Zone → 대화상자 → 알림 → 로그인 → 인트로 → 커서 빛.
 * 공간은 항상 떠 있고, 어느 층이 보이는지는 주소와 uiStore가 정한다.
 */
export function App() {
  const initSession = useSessionStore((state) => state.init)
  const ready = useSessionStore((state) => canLoadArchive(state.status))
  const initArchive = useArchiveStore((state) => state.init)
  useGlobalHotkeys()

  useEffect(() => {
    void initSession()
  }, [initSession])

  // 불러오기에 실패하면 알리고, 그 알림을 누르면 새로고침 없이 다시 불러온다.
  // 재시도가 곧바로 다시 실패해도 놓치지 않도록 렌더링이 아니라 상태가 바뀌는 순간을 듣는다.
  useEffect(
    () =>
      useArchiveStore.subscribe((state, previous) => {
        if (state.status !== 'error' || previous.status === 'error') return
        const message = `기록을 불러오지 못했습니다. ${state.error} 이 알림을 누르면 다시 불러옵니다.`
        useUiStore.getState().notify(message, 'warning', () => void initArchive())
      }),
    [initArchive],
  )

  // 원격 저장소를 쓸 때는 로그인한 뒤에 기록을 불러온다
  useEffect(() => {
    if (ready) void initArchive()
  }, [ready, initArchive])

  return (
    <>
      <Space />
      <ProjectLayer />
      <Hud />
      <UploadDropzone />
      <DialogHost />
      <Toaster />
      <SignInGate />
      <Intro />
      <CursorGlow />
    </>
  )
}
