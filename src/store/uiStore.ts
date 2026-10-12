import { create } from 'zustand';
import { GRAPH } from '@/config/graph';
import type { ItemType } from '@/config/itemTypes';
import type { ThemePreference } from '@/config/theme';
import { preferencesService } from '@/services/preferencesService';
import type { ItemDraft } from '@/types/archive';

interface EditorState {
  open: boolean;
  /** 열 때마다 증가 — 폼 상태를 새로 만들기 위한 key */
  session: number;
  itemId: string | null;
  preset: Partial<ItemDraft> | null;
}

interface GraphUiState {
  focusMode: boolean;
  focusDepth: number;
  hiddenTypes: ItemType[];
}

interface UiState {
  selectedId: string | null;
  select(id: string | null): void;

  inspectorOpen: boolean;
  toggleInspector(): void;

  drawerOpen: boolean;
  setDrawerOpen(open: boolean): void;

  searchOpen: boolean;
  setSearchOpen(open: boolean): void;

  editor: EditorState;
  openEditor(options?: { itemId?: string; preset?: Partial<ItemDraft> }): void;
  closeEditor(): void;

  graph: GraphUiState;
  setFocusMode(enabled: boolean): void;
  setFocusDepth(depth: number): void;
  toggleGraphType(type: ItemType): void;

  theme: ThemePreference;
  setTheme(theme: ThemePreference): void;
}

const clampDepth = (depth: number) => Math.min(GRAPH.focus.maxDepth, Math.max(GRAPH.focus.minDepth, depth));

export const useUiStore = create<UiState>((set) => ({
  selectedId: null,
  select: (id) => set((state) => ({ selectedId: id, inspectorOpen: id ? true : state.inspectorOpen })),

  inspectorOpen: true,
  toggleInspector: () => set((state) => ({ inspectorOpen: !state.inspectorOpen })),

  drawerOpen: false,
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),

  searchOpen: false,
  setSearchOpen: (searchOpen) => set({ searchOpen }),

  editor: { open: false, session: 0, itemId: null, preset: null },
  openEditor: (options = {}) =>
    set((state) => ({
      editor: {
        open: true,
        session: state.editor.session + 1,
        itemId: options.itemId ?? null,
        preset: options.preset ?? null,
      },
      searchOpen: false,
      drawerOpen: false,
    })),
  closeEditor: () => set((state) => ({ editor: { ...state.editor, open: false } })),

  graph: { focusMode: false, focusDepth: GRAPH.focus.defaultDepth, hiddenTypes: [] },
  setFocusMode: (focusMode) => set((state) => ({ graph: { ...state.graph, focusMode } })),
  setFocusDepth: (depth) => set((state) => ({ graph: { ...state.graph, focusDepth: clampDepth(depth) } })),
  toggleGraphType: (type) =>
    set((state) => {
      const { hiddenTypes } = state.graph;
      const next = hiddenTypes.includes(type) ? hiddenTypes.filter((t) => t !== type) : [...hiddenTypes, type];
      return { graph: { ...state.graph, hiddenTypes: next } };
    }),

  theme: preferencesService.get().theme,
  setTheme: (theme) => {
    preferencesService.set({ theme });
    set({ theme });
  },
}));
