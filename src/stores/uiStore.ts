import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UiState {
  showSidebar: boolean;
  showPanel: boolean;
  showLegend: boolean;
}

interface UiActions {
  toggleSidebar: () => void;
  togglePanel: () => void;
  toggleLegend: () => void;
  /** true = hide all three rails; false = show all three. */
  setFocusMode: (on: boolean) => void;
  /** Derived: true when all three rails are hidden. */
  isFocus: () => boolean;
}

type UiStore = UiState & UiActions;

export const useUiStore = create<UiStore>()(
  persist(
    (set, get) => ({
      showSidebar: true,
      showPanel: true,
      showLegend: false,

      toggleSidebar: () => set((s) => ({ showSidebar: !s.showSidebar })),
      togglePanel: () => set((s) => ({ showPanel: !s.showPanel })),
      toggleLegend: () => set((s) => ({ showLegend: !s.showLegend })),

      setFocusMode: (on) =>
        set({ showSidebar: !on, showPanel: !on, showLegend: !on }),

      isFocus: () => {
        const { showSidebar, showPanel, showLegend } = get();
        return !showSidebar && !showPanel && !showLegend;
      },
    }),
    {
      name: "saude-territorial-ui",
      // Only persist the boolean flags; actions are always reconstructed.
      partialize: (s) => ({
        showSidebar: s.showSidebar,
        showPanel: s.showPanel,
        showLegend: s.showLegend,
      }),
    },
  ),
);
