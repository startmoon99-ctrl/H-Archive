import { useEffect, useState } from 'react';
import { MOTION } from '@/config/motion';

export type PresenceState = 'open' | 'closing';

/**
 * 닫히는 애니메이션이 끝날 때까지 DOM에 남겨 두기 위한 훅.
 * 진입은 CSS keyframe 이 마운트 시점에 재생하고, 퇴장은 data-state="closing" 으로 재생한다.
 */
export function usePresence(open: boolean, exitDuration: number = MOTION.duration.base) {
  const [mounted, setMounted] = useState(open);
  if (open && !mounted) setMounted(true);

  useEffect(() => {
    if (open) return;
    const timer = setTimeout(() => setMounted(false), exitDuration);
    return () => clearTimeout(timer);
  }, [open, exitDuration]);

  return { mounted, state: (open ? 'open' : 'closing') as PresenceState };
}
