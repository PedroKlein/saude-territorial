// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { FeatureCollection } from "geojson";
import {
  buildTerritoryIndex,
  countPatientsInTerritories,
  getTerritoryId,
  getTerritoryName,
  getTerritorySubtitle,
  isPointInGeometry,
} from "./spatial";

const SAMPLE_BAIRROS: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { nome: "SANTA TEREZA" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-51.225, -30.06],
            [-51.21, -30.06],
            [-51.21, -30.08],
            [-51.225, -30.08],
            [-51.225, -30.06],
          ],
          // Hole inside territory
          [
            [-51.22, -30.068],
            [-51.218, -30.068],
            [-51.218, -30.07],
            [-51.22, -30.07],
            [-51.22, -30.068],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: { nome: "CRISTAL" },
      geometry: {
        type: "MultiPolygon",
        coordinates: [
          [
            [
              [-51.24, -30.07],
              [-51.226, -30.07],
              [-51.226, -30.09],
              [-51.24, -30.09],
              [-51.24, -30.07],
            ],
          ],
        ],
      },
    },
  ],
};

const SAMPLE_UNITS: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        Name: "CF Moab Caldas",
        CNES: 6883184,
        Coordenado: "OESTE",
        Distrito_S: "CRUZEIRO",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-51.222, -30.065],
            [-51.212, -30.065],
            [-51.212, -30.075],
            [-51.222, -30.075],
            [-51.222, -30.065],
          ],
        ],
      },
    },
  ],
};

const SAMPLE_MICROAREAS: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: { id: "MA1", nome: "Microárea 1", acs: "ACS Maria" },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-51.221, -30.065],
            [-51.215, -30.065],
            [-51.215, -30.072],
            [-51.221, -30.072],
            [-51.221, -30.065],
          ],
        ],
      },
    },
  ],
};

describe("territories/spatial", () => {
  it("extracts IDs, names, and subtitles for microáreas, bairros, and health unit territories", () => {
    const ma = SAMPLE_MICROAREAS.features[0]!;
    expect(getTerritoryId(ma)).toBe("MA1");
    expect(getTerritoryName(ma)).toBe("Microárea 1");
    expect(getTerritorySubtitle(ma)).toBe("ACS Maria");

    const unit = SAMPLE_UNITS.features[0]!;
    expect(getTerritoryId(unit)).toBe("6883184");
    expect(getTerritoryName(unit)).toBe("CF Moab Caldas");
    expect(getTerritorySubtitle(unit)).toBe("Distrito CRUZEIRO · OESTE");

    const bairro = SAMPLE_BAIRROS.features[0]!;
    expect(getTerritoryId(bairro)).toBe("SANTA TEREZA");
    expect(getTerritoryName(bairro)).toBe("SANTA TEREZA");
    expect(getTerritorySubtitle(bairro)).toBeNull();
  });

  it("checks point-in-polygon with hole exclusion and MultiPolygon support", () => {
    const santaTereza = SAMPLE_BAIRROS.features[0]!.geometry;
    expect(isPointInGeometry(-51.215, -30.065, santaTereza)).toBe(true);
    expect(isPointInGeometry(-51.219, -30.069, santaTereza)).toBe(false);
    expect(isPointInGeometry(-51.1, -30.01, santaTereza)).toBe(false);

    const cristal = SAMPLE_BAIRROS.features[1]!.geometry;
    expect(isPointInGeometry(-51.23, -30.08, cristal)).toBe(true);
  });

  it("counts unique patients spatially per territory and ignores null coords", () => {
    const index = buildTerritoryIndex(SAMPLE_BAIRROS);
    const counts = countPatientsInTerritories(index, [
      { id: "p1", lat: -30.065, lng: -51.215 },
      { id: "p1", lat: -30.065, lng: -51.215 },
      { id: "p2", lat: -30.08, lng: -51.23 },
      { id: "p3", lat: null, lng: null },
      { id: "p4", lat: -30.069, lng: -51.219 },
    ]);

    expect(counts.get("SANTA TEREZA")).toBe(1);
    expect(counts.get("CRISTAL")).toBe(1);
  });

  it("matches microáreas by explicit tag first and falls back to spatial containment when unset", () => {
    const counts = countPatientsInTerritories(
      SAMPLE_MICROAREAS,
      [
        { id: "p1", lat: -30.01, lng: -51.1, microarea: "MA1" },
        { id: "p2", lat: -30.068, lng: -51.218, microarea: "MA5" },
        { id: "p3", lat: -30.068, lng: -51.218, microarea: null },
      ],
      { matchProperty: "microarea" },
    );

    expect(counts.get("MA1")).toBe(2);
  });
});
