import { ArrowLeft, Menu, PanelRight, Plus, Search } from 'lucide-react';
import { useLocation, useMatch, useNavigate } from 'react-router';
import { IconButton } from '@/components/IconButton';
import { TypeIcon } from '@/components/TypeIcon';
import { APP_NAME } from '@/config/app';
import { findNavItem, ROUTE_PATTERNS, ROUTES } from '@/config/navigation';
import { SHORTCUTS } from '@/config/shortcuts';
import { THEME_OPTIONS } from '@/config/theme';
import { useLayout } from '@/hooks/useLayout';
import { useItem } from '@/store/selectors';
import { useUiStore } from '@/store/uiStore';

export function TopBar() {
  const layout = useLayout();
  const navigate = useNavigate();
  const location = useLocation();
  const itemMatch = useMatch(ROUTE_PATTERNS.item);
  const item = useItem(itemMatch?.params.id);

  const theme = useUiStore((state) => state.theme);
  const setTheme = useUiStore((state) => state.setTheme);
  const inspectorOpen = useUiStore((state) => state.inspectorOpen);
  const toggleInspector = useUiStore((state) => state.toggleInspector);
  const setDrawerOpen = useUiStore((state) => state.setDrawerOpen);
  const setSearchOpen = useUiStore((state) => state.setSearchOpen);
  const openEditor = useUiStore((state) => state.openEditor);

  const title = itemMatch ? (item?.title ?? '') : (findNavItem(location.pathname)?.label ?? APP_NAME);
  const themeIndex = THEME_OPTIONS.findIndex((option) => option.id === theme);
  const currentTheme = THEME_OPTIONS[themeIndex];
  const nextTheme = THEME_OPTIONS[(themeIndex + 1) % THEME_OPTIONS.length];

  const goBack = () => {
    // 주소를 직접 열어 돌아갈 기록이 없으면 그래프로 보낸다
    if (location.key === 'default') navigate(ROUTES.graph);
    else navigate(-1);
  };

  return (
    <header className="topbar">
      {itemMatch ? (
        <IconButton icon={ArrowLeft} label="뒤로" onClick={goBack} />
      ) : (
        layout === 'mobile' && <IconButton icon={Menu} label="메뉴 열기" onClick={() => setDrawerOpen(true)} />
      )}

      <div className="topbar__title">
        {itemMatch && item && <TypeIcon type={item.type} size={17} />}
        <h1>{title}</h1>
      </div>

      <button type="button" className="topbar__search" aria-label="검색" onClick={() => setSearchOpen(true)}>
        <Search size={16} aria-hidden />
        <span>검색</span>
        <kbd>{SHORTCUTS.search.hint}</kbd>
      </button>

      {layout !== 'mobile' && (
        <button type="button" className="btn btn--primary" onClick={() => openEditor()}>
          <Plus size={16} aria-hidden />
          새 항목
        </button>
      )}

      <IconButton
        icon={currentTheme.icon}
        label={`${currentTheme.label} · 눌러서 ${nextTheme.label}로 전환`}
        onClick={() => setTheme(nextTheme.id)}
      />

      {layout === 'desktop' && (
        <IconButton icon={PanelRight} label="정보 패널" active={inspectorOpen} onClick={toggleInspector} />
      )}
    </header>
  );
}
