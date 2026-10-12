import { useEffect } from 'react'
import { Upload } from 'lucide-react'
import { useAddAction } from '@/app/useAddAction'
import { useArchiveRoute } from '@/app/useArchiveRoute'
import { useLatest } from '@/hooks/useLatest'
import { usePresence } from '@/hooks/usePresence'
import { useUiStore } from '@/store/uiStore'
import './upload-dropzone.css'

function carriesFiles(event: DragEvent): boolean {
  return event.dataTransfer?.types.includes('Files') ?? false
}

/** 창 어디에서든 파일 드래그를 감지해 store에 알리고, 놓으면 추가 폼으로 넘긴다. */
function useFileDrop(): void {
  const latestAdd = useLatest(useAddAction())

  useEffect(() => {
    const { setDraggingFiles } = useUiStore.getState()
    // dragenter / dragleave는 자식 요소마다 일어나므로 깊이를 센다
    let depth = 0

    const onDragEnter = (event: DragEvent) => {
      if (!carriesFiles(event)) return
      event.preventDefault()
      depth += 1
      setDraggingFiles(true)
    }
    const onDragOver = (event: DragEvent) => {
      if (!carriesFiles(event)) return
      event.preventDefault()
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
    }
    const onDragLeave = (event: DragEvent) => {
      if (!carriesFiles(event)) return
      depth = Math.max(depth - 1, 0)
      if (depth === 0) setDraggingFiles(false)
    }
    const onDrop = (event: DragEvent) => {
      if (!carriesFiles(event)) return
      event.preventDefault()
      depth = 0
      setDraggingFiles(false)
      // 폴더는 크기와 종류가 비어 있는 항목으로 들어온다
      const files = [...(event.dataTransfer?.files ?? [])].filter((file) => file.size > 0 || file.type !== '')
      if (files.length > 0) latestAdd.current(files)
    }

    window.addEventListener('dragenter', onDragEnter)
    window.addEventListener('dragover', onDragOver)
    window.addEventListener('dragleave', onDragLeave)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onDragEnter)
      window.removeEventListener('dragover', onDragOver)
      window.removeEventListener('dragleave', onDragLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [latestAdd])
}

/**
 * Drag & Drop의 받는 쪽. 파일을 끌어오면 은하가 물러나고(galaxy.css) 가운데에 Drop Zone이 열린다.
 * 놓은 뒤의 입력 → 저장 → 새 행성의 등장은 추가 폼과 은하가 이어받는다.
 */
export function UploadDropzone() {
  useFileDrop()
  const dragging = useUiStore((state) => state.isDraggingFiles)
  const { view } = useArchiveRoute()
  const { mounted, state } = usePresence(dragging, 'base')
  if (!mounted) return null

  return (
    <div className="dropzone" data-state={state} aria-hidden="true">
      <div className="dropzone__portal">
        <span className="dropzone__ring" />
        <span className="dropzone__ring" />
        <span className="dropzone__ring" />
        <Upload className="dropzone__icon" />
      </div>
      <p className="dropzone__title">{view === 'project' ? '여기에 놓아 새 기록으로' : '여기에 놓아 은하에 더하기'}</p>
      <p className="eyebrow">Drop to archive</p>
    </div>
  )
}
