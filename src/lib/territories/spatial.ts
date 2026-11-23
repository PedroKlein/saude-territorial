import type { Feature, FeatureCollection, Geometry, Position } from "geojson";
import { ALERT_RULES } from "@/config/alert-rules.config";
import type { LayerId } from "@/config/layers.config";
import type { LayeredPatientData, PatientRecord } from "@/hooks/usePatientData";
import { evaluatePatient } from "@/lib/alerts/engine";

/** [minLng, minLat, maxLng, maxLat] */
export type BBox = [number, number, number, number];

export type IndexedTerritoryFeature = {
  id: string;
  name: string;
  subtitle: string | null;
  feature: Feature;
  bbox: BBox | null;
};

export type TerritoryPatientPoint = {
  id: string;
  lat: number | null | undefined;
  lng: number | null | undefined;
  microarea?: string | null;
};

type FilterableWithAlerts = PatientRecord & {
  alertLevel: string;
};

function readProps(feature: Feature): Record<string, unknown> {
  return feature.properties ?? {};
}

function readStringOrNumber(val: unknown): string | null {
  if (typeof val === "string") {
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  if (typeof val === "number" && Number.isFinite(val)) {
    return String(val);
  }
  return null;
}

/**
 * Resolves a stable identifier for a GeoJSON territory feature across
 * microáreas (`id`), health unit territories (`CNES` / `Name`), and
 * bairros (`nome`).
 */
export function getTerritoryId(feature: Feature, fallbackIndex = 0): string {
  const props = readProps(feature);
  return (
    readStringOrNumber(props.id) ??
    readStringOrNumber(props.CNES) ??
    readStringOrNumber(props.nome) ??
    readStringOrNumber(props.Name) ??
    `feature-${fallbackIndex}`
  );
}

/** Resolves the human-readable name for a territory feature. */
export function getTerritoryName(feature: Feature): string {
  const props = readProps(feature);
  return (
    readStringOrNumber(props.nome) ??
    readStringOrNumber(props.Name) ??
    readStringOrNumber(props.id) ??
    "Território"
  );
}

export function getTerritorySubtitle(feature: Feature): string | null {
  const props = readProps(feature);
  const acs = readStringOrNumber(props.acs);
  if (acs) return acs;

  const distrito = readStringOrNumber(props.Distrito_S);
  const coord = readStringOrNumber(props.Coordenado);
  if (distrito && coord) return `Distrito ${distrito} · ${coord}`;
  if (distrito) return `Distrito ${distrito}`;
  if (coord) return coord;
  return null;
}

function extendRingBBox(ring: Position[], acc: BBox): void {
  for (const pos of ring) {
    const x = pos[0];
    const y = pos[1];
    if (x === undefined || y === undefined) continue;
    if (x < acc[0]) acc[0] = x;
    if (y < acc[1]) acc[1] = y;
    if (x > acc[2]) acc[2] = x;
    if (y > acc[3]) acc[3] = y;
  }
}

/** Computes [minLng, minLat, maxLng, maxLat] for Polygon/MultiPolygon geometries. */
export function computeGeometryBBox(geometry: Geometry | null | undefined): BBox | null {
  if (!geometry) return null;
  const acc: BBox = [Infinity, Infinity, -Infinity, -Infinity];

  if (geometry.type === "Polygon") {
    const outer = geometry.coordinates[0];
    if (!outer || outer.length === 0) return null;
    extendRingBBox(outer, acc);
  } else if (geometry.type === "MultiPolygon") {
    let hasRing = false;
    for (const poly of geometry.coordinates) {
      const outer = poly[0];
      if (!outer || outer.length === 0) continue;
      hasRing = true;
      extendRingBBox(outer, acc);
    }
    if (!hasRing) return null;
  } else {
    return null;
  }

  return Number.isFinite(acc[0]) ? acc : null;
}

function isPointInRing(lng: number, lat: number, ring: Position[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const pi = ring[i];
    const pj = ring[j];
    if (!pi || !pj) continue;
    const xi = pi[0];
    const yi = pi[1];
    const xj = pj[0];
    const yj = pj[1];
    if (xi === undefined || yi === undefined || xj === undefined || yj === undefined) continue;

    const intersect =
      (yi > lat) !== (yj > lat) &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function isPointInPolygonRings(lng: number, lat: number, rings: Position[][]): boolean {
  const outer = rings[0];
  if (!outer || !isPointInRing(lng, lat, outer)) return false;
  for (let i = 1; i < rings.length; i++) {
    const hole = rings[i];
    if (hole && isPointInRing(lng, lat, hole)) return false;
  }
  return true;
}

/**
 * Ray-casting point-in-polygon check with optional bounding-box pre-filter.
 */
export function isPointInGeometry(
  lng: number,
  lat: number,
  geometry: Geometry | null | undefined,
  bbox?: BBox | null,
): boolean {
  if (!geometry) return false;
  if (bbox && (lng < bbox[0] || lng > bbox[2] || lat < bbox[1] || lat > bbox[3])) {
    return false;
  }

  if (geometry.type === "Polygon") {
    return isPointInPolygonRings(lng, lat, geometry.coordinates);
  }
  if (geometry.type === "MultiPolygon") {
    return geometry.coordinates.some((poly) => isPointInPolygonRings(lng, lat, poly));
  }
  return false;
}

export function buildTerritoryIndex(
  collection: FeatureCollection,
): IndexedTerritoryFeature[] {
  return collection.features.map((feature, index) => ({
    id: getTerritoryId(feature, index),
    name: getTerritoryName(feature),
    subtitle: getTerritorySubtitle(feature),
    feature,
    bbox: computeGeometryBBox(feature.geometry),
  }));
}

/**
 * Computes distinct patient counts per territory feature.
 */
export function countPatientsInTerritories(
  source: FeatureCollection | IndexedTerritoryFeature[],
  patients: TerritoryPatientPoint[],
  options?: { matchProperty?: "microarea" },
): Map<string, number> {
  const index = Array.isArray(source) ? source : buildTerritoryIndex(source);
  const counts = new Map<string, number>();
  const featureIds = new Set<string>();

  for (const item of index) {
    counts.set(item.id, 0);
    featureIds.add(item.id);
  }

  const seenPatientIds = new Set<string>();

  for (const p of patients) {
    if (seenPatientIds.has(p.id)) continue;
    seenPatientIds.add(p.id);

    if (options?.matchProperty === "microarea" && typeof p.microarea === "string") {
      const ma = p.microarea.trim();
      if (ma.length > 0) {
        if (featureIds.has(ma)) {
          counts.set(ma, (counts.get(ma) ?? 0) + 1);
        }
        continue;
      }
    }

    const lat = p.lat;
    const lng = p.lng;
    if (
      typeof lat !== "number" ||
      typeof lng !== "number" ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      continue;
    }

    for (const item of index) {
      if (isPointInGeometry(lng, lat, item.feature.geometry, item.bbox)) {
        counts.set(item.id, (counts.get(item.id) ?? 0) + 1);
      }
    }
  }

  return counts;
}

/**
 * Collects unique visible patients across active layers after applying alert
 * evaluation, `alertsOnly`, and sidebar `applyFilters`.
 */
export function collectVisiblePatients(
  data: LayeredPatientData | undefined,
  activeLayers: Record<LayerId, boolean>,
  alertsOnly: boolean,
  applyFilters: <T extends FilterableWithAlerts>(patients: T[]) => T[],
): TerritoryPatientPoint[] {
  if (!data) return [];

  const uniqueById = new Map<string, TerritoryPatientPoint>();

  for (const [rawLayerId, patients] of Object.entries(data)) {
    const layerId = rawLayerId as LayerId;
    if (!activeLayers[layerId]) continue;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- LayeredPatientData is Partial<Record<...>>; Object.values()/entries() can still yield undefined at runtime
    if (!patients || patients.length === 0) continue;

    const enriched: FilterableWithAlerts[] = patients.map((p) => ({
      ...p,
      alertLevel: evaluatePatient(ALERT_RULES, p, layerId).level,
    }));

    const alertFiltered = alertsOnly
      ? enriched.filter(
          (p) => p.alertLevel === "vermelho" || p.alertLevel === "amarelo",
        )
      : enriched;

    const filtered = applyFilters(alertFiltered);

    for (const p of filtered) {
      if (!uniqueById.has(p.id)) {
        uniqueById.set(p.id, {
          id: p.id,
          lat: p.lat,
          lng: p.lng,
          microarea: typeof p.microarea === "string" ? p.microarea : null,
        });
      }
    }
  }

  return Array.from(uniqueById.values());
}
