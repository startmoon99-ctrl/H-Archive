import { useRef } from 'react'
import { Paperclip, X } from 'lucide-react'
import { Button } from '@/components/Button'
import { MEDIA_KINDS, detectMediaKind } from '@/config/media'
import { formatBytes } from '@/utils/format'
import './file-staging.css'

interface FileStagingProps {
  files: File[]
  onChange: (files: File[]) => void
}

/**
 * 저장을 기다리는 파일 목록. 화면으로 끌어다 놓은 파일도 여기에 쌓인다.
 * 모바일에서는 버튼이 사진 · 파일 선택 창을 연다.
 */
export function FileStaging({ files, onChange }: FileStagingProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="staging">
      {files.length > 0 && (
        <ul className="staging__list">
          {files.map((file, index) => {
            const { icon: Icon, label } = MEDIA_KINDS[detectMediaKind(file.type, file.name)]
            return (
              <li key={`${file.name}-${file.lastModified}-${index}`} className="staging__item">
                <Icon aria-hidden="true" />
                <span className="staging__name">{file.name}</span>
                <span className="staging__meta">
                  {label} · {formatBytes(file.size)}
                </span>
                <button
                  type="button"
                  className="staging__remove"
                  aria-label={`${file.name} 빼기`}
                  onClick={() => onChange(files.filter((_, i) => i !== index))}
                >
                  <X aria-hidden="true" />
                </button>
              </li>
            )
          })}
        </ul>
      )}

      <input
        ref={inputRef}
        className="visually-hidden"
        type="file"
        multiple
        tabIndex={-1}
        onChange={(event) => {
          onChange([...files, ...(event.target.files ?? [])])
          event.target.value = ''
        }}
      />
      <Button icon={Paperclip} variant="ghost" size="sm" onClick={() => inputRef.current?.click()}>
        파일 · 사진 고르기
      </Button>
      <p className="staging__hint">이 화면 어디에든 파일을 끌어다 놓아도 됩니다.</p>
    </div>
  )
}
