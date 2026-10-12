import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router';
import { EmptyState } from '@/components/EmptyState';
import { ROUTE_PATTERNS, ROUTES } from '@/config/navigation';
import { AppShell } from '@/features/layout/AppShell';
import { useTheme } from '@/hooks/useTheme';
import { GalleryPage } from '@/pages/GalleryPage';
import { GraphPage } from '@/pages/GraphPage';
import { ItemPage } from '@/pages/ItemPage';
import { RecentPage } from '@/pages/RecentPage';
import { TagsPage } from '@/pages/TagsPage';
import { useArchiveStore } from '@/store/archiveStore';

export function App() {
  const status = useArchiveStore((state) => state.status);
  const load = useArchiveStore((state) => state.load);
  const loadError = useArchiveStore((state) => state.loadError);
  useTheme();

  useEffect(() => {
    void load();
  }, [load]);

  if (status === 'loading') return null;
  if (status === 'error') {
    return <EmptyState title="아카이브를 불러오지 못했어요" description={loadError ?? undefined} />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path={ROUTE_PATTERNS.graph} element={<GraphPage />} />
          <Route path={ROUTE_PATTERNS.gallery} element={<GalleryPage />} />
          <Route path={ROUTE_PATTERNS.tags} element={<TagsPage />} />
          <Route path={ROUTE_PATTERNS.recent} element={<RecentPage />} />
          <Route path={ROUTE_PATTERNS.item} element={<ItemPage />} />
          <Route path="*" element={<Navigate to={ROUTES.graph} replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
