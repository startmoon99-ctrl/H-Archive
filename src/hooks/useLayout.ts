import { useSyncExternalStore } from 'react';
import { resolveLayout, type Layout } from '@/config/breakpoints';

const subscribe = (onChange: () => void) => {
  window.addEventListener('resize', onChange);
  return () => window.removeEventListener('resize', onChange);
};

const getSnapshot = (): Layout => resolveLayout(window.innerWidth);

/** 현재 화면 폭에 해당하는 레이아웃. 구조가 달라지는 분기는 CSS가 아니라 이 값으로 결정한다. */
export const useLayout = (): Layout => useSyncExternalStore(subscribe, getSnapshot);
