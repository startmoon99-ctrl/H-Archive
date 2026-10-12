import { useLayoutEffect } from 'react';
import type { ResolvedTheme } from '@/config/theme';
import { useUiStore } from '@/store/uiStore';

const DARK_QUERY = '(prefers-color-scheme: dark)';

/** 테마 설정을 <html data-theme> 에 반영한다 */
export function useTheme() {
  const theme = useUiStore((state) => state.theme);

  useLayoutEffect(() => {
    const media = window.matchMedia(DARK_QUERY);
    const apply = () => {
      const resolved: ResolvedTheme = theme === 'system' ? (media.matches ? 'dark' : 'light') : theme;
      document.documentElement.dataset.theme = resolved;
    };
    apply();
    if (theme !== 'system') return;
    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
}
