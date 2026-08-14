"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Tooltip, CircleMarker, useMapEvents } from "react-leaflet";
import { useRef, useCallback, useMemo, useState } from "react";
import type { Map as LeafletMap } from "leaflet";
import { LayerGroup } from "./LayerGroup";
import { ActiveRouteLayer } from "./ActiveRouteLayer";
import { MapController } from "./MapController";
import { ClusteredLayer } from "./ClusteredLayer";
import { TerritoryLayer } from "./TerritoryLayer";
import { MicroareaOutlines } from "./MicroareaOutlines";
import { HeatmapLayer } from "./HeatmapLayer";
import { ManualPinOverlay, PinClickCatcher } from "./ManualPinMode";
import { MICROAREAS_GEOJSON } from "@/config/microareas.data";
import { usePatientData } from "@/hooks/usePatientData";
import { useMapStore } from "@/stores/mapStore";
import { usePlannerStore } from "@/stores/plannerStore";

import { useFilterStore } from "@/stores/filterStore";
import { LAYER_CONFIG, type LayerId } from "@/config/layers.config";
import { evaluatePatient } from "@/lib/alerts/engine";
import { ALERT_RULES } from "@/config/alert-rules.config";
import { buildCoincidenceMap } from "@/components/map/markerHelpers";
import type { AlertLevel } from "@/types/alerts";
import { PatientWizard } from "@/components/wizard/PatientWizard";
// Fix default marker icon paths broken by bundlers (webpack/turbopack)
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

import { US_MOAB_CALDAS, DEFAULT_ZOOM } from "@/config/geo.constants";

// US divIcon matching the PoC style
const US_ICON = L.divIcon({
  className: "",
  html: `<div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;background:#2563eb;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3)">
    <span style="color:white;font-size:10px;font-weight:bold">US</span>
  </div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// Alert-level → heatmap-intensity weighting. Module-scope so useMemo's
// dep array stays clean (React Compiler flagged the in-component variant).
const INTENSITY_MAP: Record<AlertLevel, number> = {
  vermelho: 1.0,
  amarelo: 0.6,
  verde: 0.3,
};


// ---------------------------------------------------------------------------
// Map-event child components (must render inside <MapContainer>)
// ---------------------------------------------------------------------------

/**
 * Suppresses the browser context menu and fires onRightClick with the
 * clicked map coord. No-ops when pinningPatient is active or the planner
 * drawer is open.
 */
function RightClickCatcher({
  pinningPatient,
  plannerDrawerOpen,
  onRightClick,
}: {
  pinningPatient: unknown;
  plannerDrawerOpen: boolean;
  onRightClick: (c: { lat: number; lng: number }) => void;
}) {
  useMapEvents({
    contextmenu(e) {
      if (pinningPatient !== null || plannerDrawerOpen) return;
      e.originalEvent.preventDefault();
      onRightClick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

export default function MapView() {
  const mapRef = useRef<LeafletMap>(null);
  const { data } = usePatientData();
  const activeRoute = useMapStore((s) => s.activeRoute);
  const showTerritories = useMapStore((s) => s.showTerritories);
  const vizMode = useMapStore((s) => s.vizMode);
  const activeLayers = useMapStore((s) => s.activeLayers);
  const pinningPatient = useMapStore((s) => s.pinningPatient);
  const setPinningPatient = useMapStore((s) => s.setPinningPatient);
  const plannerDrawerOpen = usePlannerStore((s) => s.drawerOpen);
  const plannerStops = usePlannerStore((s) => s.stops);
  const setMicroareaFilter = useFilterStore((s) => s.setMicroareaFilter);
  const currentMicroareas = useFilterStore((s) => s.microareas);
  const [pendingCoords, setPendingCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [rightClickCoords, setRightClickCoords] = useState<{ lat: number; lng: number } | null>(null);


  const handleMicroareaClick = useCallback(
    (id: string) => {
      // Toggle: if already filtered to this MA, clear; otherwise set filter
      if (currentMicroareas.length === 1 && currentMicroareas[0] === id) {
        setMicroareaFilter([]);
      } else {
        setMicroareaFilter([id]);
      }
    },
    [currentMicroareas, setMicroareaFilter]
  );

  const layerIds = Object.keys(LAYER_CONFIG) as LayerId[];
  const heatmapPoints = useMemo(() => {
    if (vizMode !== "heatmap" || !data) return [];
    const points: { lat: number; lng: number; intensity: number }[] = [];
    for (const layerId of layerIds) {
      if (!activeLayers[layerId]) continue;
      const patients = data[layerId];
      if (!patients) continue;
      for (const p of patients) {
        const result = evaluatePatient(ALERT_RULES, p, layerId);
        const level = (result.level ?? "verde") as AlertLevel;
        points.push({
          lat: p.lat,
          lng: p.lng,
          intensity: INTENSITY_MAP[level],
        });
      }
    }
    return points;
  }, [data, vizMode, activeLayers, layerIds]);

  // Cross-layer coincidence map: coord key → total marker count across all layers.
  // Memoised so the stable Map reference avoids re-rendering every LayerGroup.
  const coincidenceMap = useMemo(() => {
    if (!data) return new Map<string, number>();
    const all: Array<{ lat: number; lng: number }> = [];
    for (const patients of Object.values(data)) {
      if (patients) all.push(...patients);
    }
    return buildCoincidenceMap(all);
  }, [data]);

  // Planner stop coordinates — resolved from patient data by stop.patientId.
  const plannerMarkerData = useMemo(() => {
    if (!plannerDrawerOpen || plannerStops.length === 0 || !data) return [];
    const out: { order: number; lat: number; lng: number }[] = [];
    for (const stop of plannerStops) {
      for (const patients of Object.values(data)) {
        const p = patients?.find((q) => q.id === stop.patientId);
        if (p && typeof p.lat === "number" && typeof p.lng === "number") {
          out.push({ order: stop.order, lat: p.lat, lng: p.lng });
          break;
        }
      }
    }
    return out;
  }, [plannerDrawerOpen, plannerStops, data]);

  return (
    <>
      <MapContainer
        ref={mapRef}
        center={US_MOAB_CALDAS}
        zoom={DEFAULT_ZOOM}
        className="h-full w-full"
      >
        {/*
         * CartoDB Positron basemap (DS-8): muted light-grey canvas lets
         * coloured condition markers (gestante/tuberculose/hipertensao) visually
         * dominate without competing background noise. High-contrast OSM tiles
         * would fight the marker palette. maxZoom 20 matches CartoDB's tile set.
         */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={20}
        />
        <Marker position={US_MOAB_CALDAS} icon={US_ICON}>
          <Tooltip direction="top" offset={[0, -18]}>
            US Moab Caldas
          </Tooltip>
        </Marker>
        <MapController data={data} />
        {showTerritories && (
          <>
            <TerritoryLayer
              geojson={MICROAREAS_GEOJSON}
              onMicroareaClick={handleMicroareaClick}
            />
            <MicroareaOutlines
              geojson={MICROAREAS_GEOJSON}
              filteredIds={currentMicroareas}
            />
          </>
        )}
        <ClusteredLayer>
          {vizMode === "markers" &&
            data &&
            layerIds.map((layerId) => {
              const patients = data[layerId];
              if (!patients || patients.length === 0) return null;
              return (
                <LayerGroup
                  key={layerId}
                  layerId={layerId}
                  patients={patients}
                  coincidenceMap={coincidenceMap}
                />
              );
            })}
        </ClusteredLayer>
        {/* Numbered planner stop markers — rendered above patient markers,   */}
        {/* outside ClusteredLayer so they never cluster away.                */}
        {plannerDrawerOpen &&
          plannerMarkerData.map(({ order, lat, lng }) => (
            <CircleMarker
              key={`planner-stop-${order}`}
              center={[lat, lng]}
              radius={14}
              pathOptions={{
                fillColor: "oklch(58% 0.10 195)",
                color: "#fff",
                weight: 3,
                fillOpacity: 0.95,
              }}
            >
              <Tooltip permanent direction="center" className="planner-stop-badge">
                {String(order)}
              </Tooltip>
            </CircleMarker>
          ))}
        {vizMode === "heatmap" && heatmapPoints.length > 0 && (
          <HeatmapLayer points={heatmapPoints} />
        )}
        <PinClickCatcher
          active={pinningPatient !== null}
          onPick={setPendingCoords}
        />
        <RightClickCatcher
          pinningPatient={pinningPatient}
          plannerDrawerOpen={plannerDrawerOpen}
          onRightClick={setRightClickCoords}
        />

      </MapContainer>
      {/* activeRoute is written by PlannerDrawer's OSRM debouncer when the
          drawer is open; ActiveRouteLayer clears the map polyline when null. */}
      <ActiveRouteLayer route={activeRoute} mapRef={mapRef} />
      <ManualPinOverlay
        target={pinningPatient}
        pendingCoords={pendingCoords}
        clearPendingCoords={() => setPendingCoords(null)}
        onPinned={() => {
          setPinningPatient(null);
          setPendingCoords(null);
        }}
        onCancel={() => {
          setPinningPatient(null);
          setPendingCoords(null);
        }}
      />
      {rightClickCoords && (
        <PatientWizard
          open
          mode={{ kind: "new", initialCoords: rightClickCoords }}
          onClose={() => setRightClickCoords(null)}
        />
      )}
    </>
  );
}
