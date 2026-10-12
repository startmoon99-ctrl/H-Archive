import { useEffect, useLayoutEffect } from 'react';
import { Outlet, useLocation } from 'react-router';
import { BottomSheet } from '@/components/BottomSheet';
import { Drawer } from '@/components/Drawer';
import { Toaster } from '@/components/Toaster';
import { ROUTES } from '@/config/navigation';
import { ItemEditor } from '@/features/editor/ItemEditor';
import { ItemInspector } from '@/features/item/ItemInspector';
import { SearchPalette } from '@/features/search/SearchPalette';
import { useGlobalShortcuts } from '@/hooks/useGlobalShortcuts';
import { useLastDefined } from '@/hooks/useLastDefined';
import { useLayout } from '@/hooks/useLayout';
import { useItem } from '@/store/selectors';
import { useUiStore } from '@/store/uiStore';
import { BottomNav } from './BottomNav';
import { InspectorPanel } from './InspectorPanel';
import { Sidebar, SidebarContent } from './Sidebar';
import { TopBar } from './TopBar';
import './layout.css';

/** 같은 상세 화면 안에서 항목만 바뀔 때도 전환 애니메이션을 재생하기 위한 key */
const getPageKey = (pathname: string) => (pathname.startsWith('/item/') ? pathname : pathname.split('/')[1]);

/**
 * 화면 뼈대. 레이아웃별로 같은 기능을 다른 컨테이너에 담는다.
 * - desktop: Sidebar | 본문 | 정보 패널
 * - tablet : Sidebar | 본문 (+ 그래프에서 선택 시 오른쪽 보조 패널)
 * - mobile : TopBar / 본문 / BottomNav (+ Drawer, BottomSheet)
 */
export function AppShell() {
  const layout = useLayout();
  const { pathname } = useLocation();
  const selectedId = useUiStore((state) => state.selectedId);
  const select = useUiStore((state) => state.select);
  const drawerOpen = useUiStore((state) => state.drawerOpen);
  const setDrawerOpen = useUiStore((state) => state.setDrawerOpen);

  useGlobalShortcuts();

  useLayoutEffect(() => {
    document.documentElement.dataset.layout = layout;
  }, [layout]);

  useEffect(() => {
    if (layout !== 'mobile') setDrawerOpen(false);
  }, [layout, setDrawerOpen]);

  // 좁은 화면에서는 그래프에서 고른 항목만 겹쳐서 보여 준다 (상세 화면은 관계를 본문 아래에 표시)
  const selected = useItem(selectedId);
  const overlayOpen = pathname === ROUTES.graph && Boolean(selected);
  const overlayItemId = useLastDefined(overlayOpen ? selectedId : null);
  const closeOverlay = () => select(null);
  const closeDrawer = () => setDrawerOpen(false);

  return (
    <div className="app">
      {layout !== 'mobile' && <Sidebar />}

      <div className="app__main">
        <TopBar />
        <main className="app__content">
          <div className="app__page" key={getPageKey(pathname)}>
            <Outlet />
          </div>
          {layout === 'tablet' && (
            <Drawer open={overlayOpen} onClose={closeOverlay} label="선택한 항목" side="right" modal={false}>
              <div className="app__overlay-scroll">
                {overlayItemId && <ItemInspector itemId={overlayItemId} onClose={closeOverlay} />}
              </div>
            </Drawer>
          )}
        </main>
        {layout === 'mobile' && <BottomNav />}
      </div>

      {layout === 'desktop' && <InspectorPanel />}

      {layout === 'mobile' && (
        <>
          <Drawer open={drawerOpen} onClose={closeDrawer} label="메뉴">
            <SidebarContent onNavigate={closeDrawer} />
          </Drawer>
          <BottomSheet open={overlayOpen} onClose={closeOverlay} label="선택한 항목">
            {overlayItemId && <ItemInspector itemId={overlayItemId} />}
          </BottomSheet>
        </>
      )}

      <ItemEditor />
      <SearchPalette />
      <Toaster />
    </div>
  );
}
