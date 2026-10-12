import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';

export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_OPTIONS: { id: ThemePreference; label: string; icon: LucideIcon }[] = [
  { id: 'system', label: '시스템 테마', icon: Monitor },
  { id: 'light', label: '라이트 테마', icon: Sun },
  { id: 'dark', label: '다크 테마', icon: Moon },
];

export const DEFAULT_THEME: ThemePreference = 'system';

export const isThemePreference = (value: unknown): value is ThemePreference =>
  THEME_OPTIONS.some((option) => option.id === value);
