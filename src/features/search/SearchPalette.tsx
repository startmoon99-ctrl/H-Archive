import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Orbit, Plus, Search, SlidersHorizontal, type LucideIcon } from 'lucide-react'
import { useAddAction } from '@/app/useAddAction'
import { useArchiveNav } from '@/app/useArchiveRoute'
import { LIMITS } from '@/config/app'
import { useArchiveStore } from '@/store/archiveStore'
import { useUiStore } from '@/store/uiStore'
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
  icon?: LucideIcon
  run: () => void
}

/**
 * 빠른 탐색. 평소에는 보이지 않다가 Ctrl/⌘ + K 또는 검색 버튼으로 열린다.
 * 검색어가 없으면 최근 창작물과 자주 쓰는 동작을 보여준다.
 */
export function SearchPalette({ onClose }: { onClose: () => void }) {
  const nav = useArchiveNav()
  const add = useAddAction()
  const openDialog = useUiStore((state) => state.openDialog)
  const categories = useArchiveStore((state) => state.categories)
  const projects = useArchiveStore((state) => state.projects)
  const [query, setQuery] = useState('')
  const [cursor, setCursor] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)

  const items = useMemo<PaletteItem[]>(() => {
    const categoryOf = new Map(categories.map((category) => [category.id, category]))
    // 검색 창을 닫은 뒤에 이동하거나 다음 창을 연다
    const then = (action: () => void) => () => {
      onClose()
      action()
    }
    const commands: PaletteItem[] = [
      { key: 'add', group: '동작', title: '창작물 추가', context: '파일을 올리고 기록을 시작합니다', icon: Plus, run: then(add) },
      {
        key: 'category',
        group: '동작',
        title: '성단 추가',
        context: '새 카테고리를 만듭니다',
        icon: Orbit,
        run: then(() => openDialog({ type: 'category' })),
      },
      {
        key: 'settings',
        group: '동작',
        title: '모션 설정',
        context: '움직임의 세기와 속도를 조절합니다',
        icon: SlidersHorizontal,
        run: then(() => openDialog({ type: 'settings' })),
      },
    ]

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
      return [...recent, ...commands]
    }

    const found = searchArchive(needle, categories, projects, LIMITS.searchResults).map<PaletteItem>((result) => ({
      key: `${result.type}-${result.id}`,
      group: result.type === 'category' ? '성단' : '창작물',
      title: result.title,
      context: result.context,
      hue: result.hue,
      run: then(() => (result.type === 'category' ? nav.toSystem(result.id) : nav.toProject(result.id))),
    }))
    return [...found, ...commands.filter((command) => command.title.toLowerCase().includes(needle))]
  }, [query, categories, projects, nav, add, openDialog, onClose])

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
        <p className="palette__empty">일치하는 기록이 없습니다.</p>
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
                <span className="palette__mark" data-kind={item.icon ? 'command' : 'star'}>
                  {item.icon && <item.icon aria-hidden="true" />}
                </span>
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
