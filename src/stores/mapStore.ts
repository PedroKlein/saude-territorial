import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { LayerId } from "@/config/layers.config";
import { LAYER_CONFIG } from "@/config/layers.config";
import type { RouteResult, RouteProfile } from "@/types/routing";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActiveRoute {
  result: RouteResult;
  profile: RouteProfile;
}


export type ViewMode = "markers" | "density" | "microarea";

/** Identifies the patient whose pin is being placed manually. */
export interface PinningTarget {
  /** DB UUID — used by mutation calls. */
  id: string;
  /** CNS — kept for user-facing text (never rendered as a raw log). */
  cns: string;
  /** Display name for the banner. */
  nomeCompleto: string | null;
}

interface MapState {
  activeLayers: Record<LayerId, boolean>;
  selectedPatient: string | null;
  mapCenter: [number, number];
  mapZoom: number;
  activeRoute: ActiveRoute | null;
  showTerritories: boolean;
  viewMode: ViewMode;
  alertsOnly: boolean;
  /** Patient currently in manual-pin-drop mode (null = not pinning). */
  pinningPatient: PinningTarget | null;
}

interface MapActions {
  toggleLayer: (id: LayerId) => void;
  setSelectedPatient: (id: string | null) => void;
  setMapView: (center: [number, number], zoom: number) => void;
  setActiveRoute: (route: ActiveRoute | null) => void;
  setShowTerritories: (show: boolean) => void;
  setViewMode: (m: ViewMode) => void;
  setAlertsOnly: (on: boolean) => void;
  setPinningPatient: (target: PinningTarget | null) => void;
}

type MapStore = MapState & MapActions;

// ---------------------------------------------------------------------------
// Initial State
// ---------------------------------------------------------------------------

const PORTO_ALEGRE: [number, number] = [-30.0346, -51.2177];

function buildInitialLayers(): Record<LayerId, boolean> {
  const layers = {} as Record<LayerId, boolean>;
  for (const key of Object.keys(LAYER_CONFIG) as LayerId[]) {
    layers[key] = true;
  }
  return layers;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useMapStore = create<MapStore>()(persist(
  (set) => ({
  activeLayers: buildInitialLayers(),
  selectedPatient: null,
  mapCenter: PORTO_ALEGRE,
  mapZoom: 14,
  activeRoute: null,
  showTerritories: false,
  viewMode: "markers",
  alertsOnly: false,
  pinningPatient: null,

  toggleLayer: (id) =>
    set((state) => ({
      activeLayers: {
        ...state.activeLayers,
        [id]: !state.activeLayers[id],
      },
    })),

  /** Sets the currently selected patient by **patient UUID** (not CNS). */
  setSelectedPatient: (id) => set({ selectedPatient: id }),

  setMapView: (center, zoom) => set({ mapCenter: center, mapZoom: zoom }),

  setActiveRoute: (route) => set({ activeRoute: route }),

  setShowTerritories: (show) => set({ showTerritories: show }),


  setViewMode: (m) => set({ viewMode: m }),

  setAlertsOnly: (on) => set({ alertsOnly: on }),

  setPinningPatient: (target) => set({ pinningPatient: target }),
}),
  {
    name: "saude-territorial-map",
    partialize: (state) => ({
      activeLayers: state.activeLayers,
      mapCenter: state.mapCenter,
      mapZoom: state.mapZoom,
      showTerritories: state.showTerritories,
      viewMode: state.viewMode,
    }),
  }
));
