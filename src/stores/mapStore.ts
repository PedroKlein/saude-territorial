import { create } from "zustand";
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

export type VizMode = "markers" | "heatmap";

interface MapState {
  activeLayers: Record<LayerId, boolean>;
  selectedPatient: string | null;
  mapCenter: [number, number];
  mapZoom: number;
  activeRoute: ActiveRoute | null;
  showTerritories: boolean;
  vizMode: VizMode;
  alertsOnly: boolean;
}

interface MapActions {
  toggleLayer: (id: LayerId) => void;
  setSelectedPatient: (cns: string | null) => void;
  setMapView: (center: [number, number], zoom: number) => void;
  setActiveRoute: (route: ActiveRoute | null) => void;
  setShowTerritories: (show: boolean) => void;
  setVizMode: (mode: VizMode) => void;
  setAlertsOnly: (on: boolean) => void;
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

export const useMapStore = create<MapStore>()((set) => ({
  activeLayers: buildInitialLayers(),
  selectedPatient: null,
  mapCenter: PORTO_ALEGRE,
  mapZoom: 14,
  activeRoute: null,
  showTerritories: false,
  vizMode: "markers",
  alertsOnly: false,

  toggleLayer: (id) =>
    set((state) => ({
      activeLayers: {
        ...state.activeLayers,
        [id]: !state.activeLayers[id],
      },
    })),

  setSelectedPatient: (cns) => set({ selectedPatient: cns }),

  setMapView: (center, zoom) => set({ mapCenter: center, mapZoom: zoom }),

  setActiveRoute: (route) => set({ activeRoute: route }),

  setShowTerritories: (show) => set({ showTerritories: show }),

  setVizMode: (mode) => set({ vizMode: mode }),

  setAlertsOnly: (on) => set({ alertsOnly: on }),
}));
