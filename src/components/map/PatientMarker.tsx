"use client";

import { Marker, Tooltip } from "react-leaflet";
import L, { type LeafletEvent } from "leaflet";
import { useMemo } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Baby, Wind, HeartPulse } from "lucide-react";
import type { ComponentType } from "react";

import { useMapStore } from "@/stores/mapStore";
import { usePlannerStore } from "@/stores/plannerStore";
import { useUpdatePatient } from "@/hooks/useUpdatePatient";
import type { AlertLevel } from "@/types/alerts";
import type { LayerId } from "@/config/layers.config";
import { AlertShape } from "@/components/ui/AlertShape";

// ---------------------------------------------------------------------------
// Layer → icon/color tables (static literals → Record per project rule)
// ---------------------------------------------------------------------------

type IconComponent = ComponentType<{ size?: number; color?: string }>;

const LAYER_ICON: Partial<Record<LayerId, IconComponent>> = {
  gestantes: Baby,
  // Lungs is unavailable in lucide-react v1.31; Wind is the spec-approved sub.
  tuberculose: Wind,
  hipertensao: HeartPulse,
};

const LAYER_FILL: Partial<Record<LayerId, string>> = {
  gestantes: "var(--color-gestante)",
  tuberculose: "var(--color-tuberculose)",
  hipertensao: "var(--color-hipertensao)",
};

/** Marker chip alert-dot is hidden for `verde` because "no alert = no badge". */
const ALERT_ON_CHIP: Record<AlertLevel, boolean> = {
  vermelho: true,
  amarelo: true,
  verde: false,
};

/** Brand teal ring for selected state (DS-11). */
const SELECTED_RING = "oklch(58% 0.10 195)";

// ---------------------------------------------------------------------------
// Chip HTML — pure component, no hooks: safe for renderToStaticMarkup
// ---------------------------------------------------------------------------

interface ChipProps {
  layerId: LayerId;
  alertLevel: AlertLevel;
  coincidenceCount: number;
  isSelected: boolean;
  isDraggable: boolean;
  /** True when this patient is a planner stop in map-select mode. */
  isPlanStop: boolean;
}

function ChipHtml({
  layerId,
  alertLevel,
  coincidenceCount,
  isSelected,
  isDraggable,
  isPlanStop,
}: ChipProps) {
  const Icon: IconComponent = LAYER_ICON[layerId] ?? HeartPulse;
  const fill = LAYER_FILL[layerId] ?? "var(--color-brand)";
  const showAlert = ALERT_ON_CHIP[alertLevel];

  const pillShadow = isSelected
    ? `0 2px 6px rgba(0,0,0,0.22), 0 0 0 2px white, 0 0 0 4px ${SELECTED_RING}`
    : "0 2px 6px rgba(0,0,0,0.18), 0 0 0 2px white";

  return (
    <div
      style={{
        position: "relative",
        width: 38,
        height: 38,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {/* Main pill */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          backgroundColor: fill,
          boxShadow: pillShadow,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: isDraggable ? "grab" : "pointer",
        }}
      >
        <Icon size={14} color="white" />
      </div>

      {/* Alert indicator — top-right corner.
          DS-16 redundant encoding: SHAPE (circle vs triangle) + COLOR so
          alert states survive deuteranopia. Rendered via <AlertShape>. */}
      {showAlert && (
        <div
          style={{
            position: "absolute",
            top: -1,
            right: -1,
            width: 14,
            height: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            filter: "drop-shadow(0 0 1px rgba(0,0,0,0.25))",
          }}
        >
          <AlertShape level={alertLevel} size={14} />
        </div>
      )}

      {/* Coincidence badge — bottom-right corner */}
      {coincidenceCount > 1 && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            right: 0,
            backgroundColor: "#1c1917",
            color: "white",
            fontSize: 9,
            fontWeight: 600,
            borderRadius: 999,
            padding: "0 3px",
            minWidth: 14,
            height: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 0 1.5px white",
            lineHeight: "1",
            boxSizing: "border-box",
          }}
        >
          {coincidenceCount}
        </div>
      )}
      {/* Plan-stop check badge — bottom-left corner (map-select mode). */}
      {isPlanStop && (
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            backgroundColor: SELECTED_RING,
            color: "white",
            fontSize: 9,
            fontWeight: 700,
            borderRadius: 999,
            width: 14,
            height: 14,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 0 0 1.5px white",
          }}
        >
          ✓
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// divIcon builder — called at render time, not module init
// ---------------------------------------------------------------------------

function buildChipIcon(
  layerId: LayerId,
  alertLevel: AlertLevel,
  coincidenceCount: number,
  isSelected: boolean,
  isDraggable: boolean,
  isPlanStop: boolean,
): L.DivIcon {
  return L.divIcon({
    className: "",
    html: renderToStaticMarkup(
      <ChipHtml
        layerId={layerId}
        alertLevel={alertLevel}
        coincidenceCount={coincidenceCount}
        isSelected={isSelected}
        isDraggable={isDraggable}
        isPlanStop={isPlanStop}
      />,
    ),
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface PatientMarkerProps {
  /** DB UUID — required for mutations and selection. */
  id: string;
  name: string | null;
  lat: number;
  lng: number;
  alertLevel: AlertLevel;
  /** Which condition layer this marker belongs to. */
  layerId: LayerId;
  /** How many markers (across all layers) share this exact coordinate. */
  coincidenceCount: number;
  /** Geocoding confidence 0-1. Below 0.5 means uncertain placement. */
  confidence?: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function PatientMarker({
  id,
  name,
  lat,
  lng,
  alertLevel,
  layerId,
  coincidenceCount,
}: PatientMarkerProps) {
  const setSelectedPatient = useMapStore((s) => s.setSelectedPatient);
  const selectedPatient = useMapStore((s) => s.selectedPatient);
  const pinningPatient = useMapStore((s) => s.pinningPatient);
  const update = useUpdatePatient();

  // Planner map-select subscriptions (fine-grained selectors → minimal re-renders).
  const mapSelectMode = usePlannerStore((s) => s.mapSelectMode);
  const isInPlan = usePlannerStore((s) => s.stops.some((st) => st.patientId === id));
  const addStopIfBelowLimit = usePlannerStore((s) => s.addStopIfBelowLimit);
  const removeStop = usePlannerStore((s) => s.removeStop);
  const setLimitBannerVisible = usePlannerStore((s) => s.setLimitBannerVisible);

  const isSelected = selectedPatient === id;
  // Drag unlocks ONLY in explicit reposition mode from the detail panel.
  const isRepositioning = pinningPatient?.id === id;
  // Show the plan-stop check badge only while map-select mode is active.
  const isPlanStop = mapSelectMode && isInPlan;

  const icon = useMemo(
    () =>
      buildChipIcon(
        layerId,
        alertLevel,
        coincidenceCount,
        isSelected || isRepositioning,
        isRepositioning,
        isPlanStop,
      ),
    [layerId, alertLevel, coincidenceCount, isSelected, isRepositioning, isPlanStop],
  );

  const emoji =
    alertLevel === "vermelho" ? "🔴" : alertLevel === "amarelo" ? "🟡" : "🟢";

  const label =
    alertLevel === "vermelho"
      ? "Crítico"
      : alertLevel === "amarelo"
        ? "Atenção"
        : "Normal";

  return (
    <Marker
      position={[lat, lng]}
      icon={icon}
      // `alt` carries the alert level so ClusteredLayer's iconCreateFunction
      // can walk child markers and determine cluster ring color without
      // parsing HTML. Accessible as marker.options.alt in Leaflet.
      alt={alertLevel}
      zIndexOffset={isSelected || isRepositioning ? 1000 : 0}
      draggable={isRepositioning}
      eventHandlers={{
        click: () => {
          if (mapSelectMode) {
            if (isInPlan) {
              removeStop(id);
            } else {
              const added = addStopIfBelowLimit(id);
              if (!added) setLimitBannerVisible(true);
            }
            return;
          }
          setSelectedPatient(id);
        },
        dragend: (e: LeafletEvent) => {
          if (!isRepositioning) return;
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
      <Tooltip direction="top" offset={[0, -8]}>
        <strong>{name ?? "Sem nome"}</strong>
        <br />
        <span style={{ fontSize: "11px" }}>
          {emoji} {label}
        </span>
      </Tooltip>
    </Marker>
  );
}
