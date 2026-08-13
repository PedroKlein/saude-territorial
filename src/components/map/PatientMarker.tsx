"use client";

import { CircleMarker, Marker, Tooltip } from "react-leaflet";
import L, {
  type CircleMarker as LeafletCircleMarker,
  type LeafletEvent,
} from "leaflet";
import { useEffect, useMemo, useRef } from "react";

import { useMapStore } from "@/stores/mapStore";
import { useRoutePlannerStore } from "@/stores/routePlannerStore";
import { useUpdatePatient } from "@/hooks/useUpdatePatient";
import type { AlertLevel } from "@/types/alerts";

/** PoC-matching urgency colors */
export const URGENCY_COLORS: Record<AlertLevel, string> = {
  vermelho: "#dc2626",
  amarelo: "#d97706",
  verde: "#16a34a",
};

/** PoC-matching urgency radii */
const URGENCY_RADIUS: Record<AlertLevel, number> = {
  vermelho: 10,
  amarelo: 8,
  verde: 6,
};

/** Selected marker style constants (matches PoC) */
const SELECTED_BORDER_COLOR = "#1e3a8a";
const SELECTED_WEIGHT = 4;
const SELECTED_RADIUS_BOOST = 4;

interface PatientMarkerProps {
  /** DB UUID — required to save drag-to-fix coordinates. */
  id: string;
  cns: string;
  name: string | null;
  lat: number;
  lng: number;
  alertLevel: AlertLevel;
  /** Geocoding confidence 0-1. Below 0.5 shows dashed border */
  confidence?: number;
}

/**
 * Build a CircleMarker-look-alike divIcon for the selected patient.
 *
 * The selected marker needs to be a `Marker` (not `CircleMarker`) so that
 * Leaflet's native `draggable: true` support kicks in — `CircleMarker`
 * extends `Path`, which has no dragging affordance without a plugin.
 * Unselected markers stay as CircleMarker for performance (Path is cheaper
 * than a DOM Marker for hundreds of pins).
 */
function selectedIcon(alertLevel: AlertLevel, draggable: boolean): L.DivIcon {
  const fillColor = URGENCY_COLORS[alertLevel];
  const radius = URGENCY_RADIUS[alertLevel] + SELECTED_RADIUS_BOOST;
  const size = (radius + SELECTED_WEIGHT) * 2;
  // Dashed border + grab cursor make it visually obvious that the marker
  // is in reposition mode. Selected-only markers keep the solid border.
  const border = draggable
    ? `${SELECTED_WEIGHT}px dashed ${SELECTED_BORDER_COLOR}`
    : `${SELECTED_WEIGHT}px solid ${SELECTED_BORDER_COLOR}`;
  const cursor = draggable ? "grab" : "pointer";
  const html = `<div style="
    width: ${radius * 2}px;
    height: ${radius * 2}px;
    background: ${fillColor};
    border: ${border};
    border-radius: 50%;
    box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    cursor: ${cursor};
  "></div>`;
  return L.divIcon({
    className: "",
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

export function PatientMarker({
  id,
  cns,
  name,
  lat,
  lng,
  alertLevel,
  confidence,
}: PatientMarkerProps) {
  const setSelectedPatient = useMapStore((s) => s.setSelectedPatient);
  const selectedPatient = useMapStore((s) => s.selectedPatient);
  const pinningPatient = useMapStore((s) => s.pinningPatient);
  const isPlanning = useRoutePlannerStore((s) => s.isPlanning);
  const addWaypoint = useRoutePlannerStore((s) => s.addWaypoint);
  const update = useUpdatePatient();
  const circleRef = useRef<LeafletCircleMarker>(null);

  const isSelected = selectedPatient === cns;
  // Drag is off by default. It only unlocks when the user explicitly
  // enters reposition mode from the detail panel — otherwise a stray
  // click-and-hold on a selected marker would drift the coord silently.
  const isRepositioning = pinningPatient?.id === id;
  const isUncertain = confidence !== undefined && confidence < 0.5;
  const fillColor = URGENCY_COLORS[alertLevel];
  const baseRadius = URGENCY_RADIUS[alertLevel];
  const radius = isSelected || isRepositioning ? baseRadius + SELECTED_RADIUS_BOOST : baseRadius;
  const emoji =
    alertLevel === "vermelho" ? "🔴" : alertLevel === "amarelo" ? "🟡" : "🟢";

  // Bring selected CircleMarker to front (unselected fallback path).
  useEffect(() => {
    if (isSelected && circleRef.current) {
      circleRef.current.bringToFront();
    }
  }, [isSelected]);

  const icon = useMemo(
    () => selectedIcon(alertLevel, isRepositioning),
    [alertLevel, isRepositioning],
  );

  const tooltip = (
    <Tooltip direction="top" offset={[0, -8]}>
      <strong>{name ?? "Sem nome"}</strong>
      <br />
      <span style={{ fontSize: "11px" }}>
        {emoji}{" "}
        {alertLevel === "vermelho"
          ? "Crítico"
          : alertLevel === "amarelo"
            ? "Atenção"
            : "Normal"}
      </span>
    </Tooltip>
  );

  // The visually-emphasised Marker+divIcon variant renders in two cases:
  //  1. `isSelected` — the user opened the detail panel for this patient.
  //  2. `isRepositioning` — the user hit "Reposicionar no mapa"; native
  //     dragging is enabled ONLY in this case.
  if (isSelected || isRepositioning) {
    return (
      <Marker
        position={[lat, lng]}
        icon={icon}
        draggable={isRepositioning}
        eventHandlers={{
          click: () => {
            if (isPlanning) {
              addWaypoint({ cns, lat, lng, name: name ?? "Sem nome" });
            }
            // else already selected — no-op.
          },
          dragend: (e: LeafletEvent) => {
            if (!isRepositioning) return;
            // Leaflet marker's dragend target is the Marker instance.
            const marker = e.target as L.Marker;
            const { lat: newLat, lng: newLng } = marker.getLatLng();
            update.mutate({
              id,
              body: { base: { lat: newLat, lng: newLng } },
              optimisticPatch: {
                lat: newLat,
                lng: newLng,
                geocodeStatus: "manual",
              },
            });
          },
        }}
      >
        {tooltip}
      </Marker>
    );
  }

  return (
    <CircleMarker
      ref={circleRef}
      center={[lat, lng]}
      radius={radius}
      pathOptions={{
        fillColor,
        color: "#ffffff",
        weight: 2,
        fillOpacity: isUncertain ? 0.45 : 0.85,
        opacity: isUncertain ? 0.6 : 1,
        dashArray: isUncertain ? "4 3" : undefined,
      }}
      eventHandlers={{
        click: () => {
          if (isPlanning) {
            addWaypoint({ cns, lat, lng, name: name ?? "Sem nome" });
          } else {
            setSelectedPatient(cns);
          }
        },
      }}
    >
      {tooltip}
    </CircleMarker>
  );
}
