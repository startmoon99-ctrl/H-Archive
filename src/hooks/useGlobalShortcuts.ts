import { useEffect } from 'react';
import { SHORTCUTS } from '@/config/shortcuts';
import { useUiStore } from '@/store/uiStore';

const isTypingTarget = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

export function useGlobalShortcuts() {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const ui = useUiStore.getState();
      const modifier = event.ctrlKey || event.metaKey;

      if (modifier && event.code === SHORTCUTS.search.code) {
        event.preventDefault();
        ui.setSearchOpen(true);
        return;
      }

      if (modifier || event.altKey || isTypingTarget(event.target)) return;
      if (ui.editor.open || ui.searchOpen) return;

      if (event.code === SHORTCUTS.create.code) {
        event.preventDefault();
        ui.openEditor();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}
