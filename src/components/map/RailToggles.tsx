"use client";

import { PanelLeft, PanelRight, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUiStore } from "@/stores/uiStore";

/**
 * Floating pip-toggle buttons on the map edges (UP-4.3).
 *
 * Each button appears only when its corresponding rail is HIDDEN, pinned to
 * the edge where the rail would be. When all three are hidden (focus mode), a
 * "Sair do modo foco" pill renders at the top-center.
 *
 * z-index 1001 sits above the Leaflet map (z-index ~400) and attribution.
 */
export function RailToggles() {
  const { showSidebar, showPanel, showLegend, toggleSidebar, togglePanel, toggleLegend, isFocus, setFocusMode } =
    useUiStore();

  const focusMode = isFocus();

  return (
    <>
      {/* Focus-mode exit pill — top-center, shown only when all three hidden */}
      {focusMode && (
        <button
          onClick={() => setFocusMode(false)}
          className="absolute top-3 left-1/2 z-[1001] -translate-x-1/2 rounded-full bg-foreground/80 px-4 py-1.5 text-xs font-medium text-background shadow-md backdrop-blur-sm transition-opacity hover:opacity-90"
          aria-label="Sair do modo foco"
        >
          Sair do modo foco
        </button>
      )}

      {/* Sidebar toggle — left edge, shown when sidebar is hidden */}
      {!showSidebar && (
        <div className="absolute top-1/2 left-2 z-[1001] -translate-y-1/2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8 rounded-full bg-background/90 shadow-md backdrop-blur-sm hover:bg-background"
            aria-label="Mostrar painel lateral"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Panel toggle — right edge, shown when panel is hidden */}
      {!showPanel && (
        <div className="absolute top-1/2 right-2 z-[1001] -translate-y-1/2">
          <Button
            variant="ghost"
            size="icon"
            onClick={togglePanel}
            className="h-8 w-8 rounded-full bg-background/90 shadow-md backdrop-blur-sm hover:bg-background"
            aria-label="Mostrar painel de detalhes"
          >
            <PanelRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Legend toggle — bottom-left, shown when legend is hidden */}
      {!showLegend && (
        <div className="absolute bottom-16 left-4 z-[1001]">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleLegend}
            className="h-8 w-8 rounded-full bg-background/90 shadow-md backdrop-blur-sm hover:bg-background"
            aria-label="Mostrar legenda"
          >
            <HelpCircle className="h-4 w-4" />
          </Button>
        </div>
      )}
    </>
  );
}
