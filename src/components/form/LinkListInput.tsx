import { Plus, X } from 'lucide-react'
import type { LinkRef } from '@/types/archive'
import { createId } from '@/utils/id'
import { Button, IconButton } from '../Button'

interface LinkListInputProps {
  value: LinkRef[]
  onChange: (value: LinkRef[]) => void
}

/** 이름 + 주소 쌍의 목록 */
export function LinkListInput({ value, onChange }: LinkListInputProps) {
  const update = (id: string, patch: Partial<LinkRef>) =>
    onChange(value.map((link) => (link.id === id ? { ...link, ...patch } : link)))

  return (
    <div className="link-list">
      {value.map((link) => (
        <div key={link.id} className="link-list__row">
          <input
            className="input"
            value={link.label}
            placeholder="이름"
            aria-label="링크 이름"
            onChange={(event) => update(link.id, { label: event.target.value })}
          />
          <input
            className="input"
            type="url"
            inputMode="url"
            value={link.url}
            placeholder="https://"
            aria-label="링크 주소"
            onChange={(event) => update(link.id, { url: event.target.value })}
          />
          <IconButton
            icon={X}
            label="링크 지우기"
            variant="quiet"
            size="sm"
            onClick={() => onChange(value.filter((item) => item.id !== link.id))}
          />
        </div>
      ))}
      <Button
        icon={Plus}
        variant="quiet"
        size="sm"
        onClick={() => onChange([...value, { id: createId(), label: '', url: '' }])}
      >
        링크 추가
      </Button>
    </div>
  )
}

/** 주소가 비어 있는 줄을 버리고, 이름이 없으면 주소를 이름으로 쓴다. */
export function cleanLinks(links: LinkRef[]): LinkRef[] {
  return links
    .map((link) => ({ ...link, label: link.label.trim(), url: link.url.trim() }))
    .filter((link) => link.url !== '')
    .map((link) => ({ ...link, label: link.label || link.url }))
}
