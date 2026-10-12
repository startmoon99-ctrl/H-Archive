import { STORAGE_KEYS } from '@/config/app';
import { DEFAULT_THEME, isThemePreference, type ThemePreference } from '@/config/theme';

export interface Preferences {
  theme: ThemePreference;
}

const DEFAULTS: Preferences = { theme: DEFAULT_THEME };

function read(): Preferences {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEYS.preferences) ?? '{}') as Partial<Preferences>;
    return { theme: isThemePreference(parsed.theme) ? parsed.theme : DEFAULTS.theme };
  } catch {
    return DEFAULTS;
  }
}

export const preferencesService = {
  get: read,
  set(patch: Partial<Preferences>) {
    try {
      localStorage.setItem(STORAGE_KEYS.preferences, JSON.stringify({ ...read(), ...patch }));
    } catch {
      // 환경 설정 저장 실패는 치명적이지 않으므로 무시한다
    }
  },
};
