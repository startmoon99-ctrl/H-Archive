import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Search } from 'lucide-react'
import { useArchiveNav } from '@/app/useArchiveRoute'
import { LIMITS } from '@/config/app'
import { useArchiveStore } from '@/store/archiveStore'
import { cssVars } from '@/utils/css'
import { formatDate } from '@/utils/format'
import { lastActivity } from '@/utils/project'
import { searchArchive } from '@/utils/search'
import './search-palette.css'

interface PaletteItem {
  key: string
  group: string
  title: string
  context: string
  hue?: number
  run: () => void
}

/**
 * 빠른 탐색. 평소에는 보이지 않다가 Ctrl/⌘ + K 또는 검색 버튼으로 열린다.
 * 검색어가 없으면 최근 창작물을 보여준다. (추가 · 설정은 상단의 아이콘에서 한다)
 */
export function SearchPalette({ onClose }: { onClose: () => void }) {
  const nav = useArchiveNav()
  const categories = useArchiveStore((state) => state.categories)
  const projects = useArchiveStore((state) => state.projects)
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)

  const items = useMemo<PaletteItem[]>(() => {
    const categoryOf = new Map(categories.map((category) => [category.id, category]))
    // 검색 창을 닫은 뒤에 이동한다
    const then = (action: () => void) => () => {
      onClose()
      action()
    }

    const needle = query.trim().toLowerCase()
    if (!needle) {
      const recent = [...projects]
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, LIMITS.recentProjects)
        .map<PaletteItem>((project) => {
          const category = categoryOf.get(project.categoryId)
          return {
            key: project.id,
            group: '최근 창작물',
            title: project.title,
            context: `${category?.name ?? ''} · ${formatDate(lastActivity(project))}`,
            hue: category?.hue,
            run: then(() => nav.toProject(project.id)),
          }
        })
      return recent
    }

    return searchArchive(needle, categories, projects, LIMITS.searchResults).map<PaletteItem>((result) => ({
      key: `${result.type}-${result.id}`,
      group: result.type === 'category' ? '성단' : '창작물',
      title: result.title,
      context: result.context,
      hue: result.hue,
      run: then(() => (result.type === 'category' ? nav.toSystem(result.id) : nav.toProject(result.id))),
    }))
  }, [query, categories, projects, nav, onClose])

  useEffect(() => setCursor(0), [query])
  useEffect(() => {
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [cursor])

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.nativeEvent.isComposing || items.length === 0) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const delta = event.key === 'ArrowDown' ? 1 : -1
      setCursor((current) => (current + delta + items.length) % items.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      items[cursor]?.run()
    }
  }

  return (
    <div className="palette">
      <label className="palette__field">
        <Search aria-hidden="true" />
        <input
          className="palette__input"
          role="combobox"
          aria-expanded="true"
          aria-controls="palette-results"
          aria-label="창작물 · 성단 · 메모 검색"
          placeholder="창작물, 태그, 그때의 메모 검색"
          value={query}
          data-autofocus
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={onKeyDown}
        />
        <kbd className="palette__hint">Esc</kbd>
      </label>

      {items.length === 0 ? (
        <p className="palette__empty">{query.trim() ? '일치하는 기록이 없습니다.' : '아직 창작물이 없습니다.'}</p>
      ) : (
        <ul ref={listRef} id="palette-results" className="palette__list scroll-area" role="listbox">
          {items.map((item, index) => (
            <li key={item.key} role="presentation">
              {item.group !== items[index - 1]?.group && <p className="palette__group eyebrow">{item.group}</p>}
              <button
                type="button"
                className="palette__item"
                role="option"
                aria-selected={index === cursor}
                tabIndex={-1}
                style={cssVars({ hue: item.hue })}
                onClick={item.run}
                onPointerMove={() => setCursor(index)}
              >
                <span className="palette__mark" data-kind="star" />
                <span className="palette__title">{item.title}</span>
                <span className="palette__context">{item.context}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
