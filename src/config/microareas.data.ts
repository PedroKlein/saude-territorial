import type { FeatureCollection } from "geojson";

/**
 * Microárea polygon boundaries for US Moab Caldas.
 * Covers the area around the health unit where demo patients are located.
 */
export const MICROAREAS_GEOJSON: FeatureCollection = {
  type: "FeatureCollection",
  features: [
    {
      type: "Feature",
      properties: {
        id: "MA1",
        nome: "Microárea 1",
        acs: "ACS Maria",
      },
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
    {
      type: "Feature",
      properties: {
        id: "MA2",
        nome: "Microárea 2",
        acs: "ACS João",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-51.215, -30.065],
            [-51.209, -30.065],
            [-51.209, -30.072],
            [-51.215, -30.072],
            [-51.215, -30.065],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "MA3",
        nome: "Microárea 3",
        acs: "ACS Ana",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-51.221, -30.072],
            [-51.215, -30.072],
            [-51.215, -30.079],
            [-51.221, -30.079],
            [-51.221, -30.072],
          ],
        ],
      },
    },
    {
      type: "Feature",
      properties: {
        id: "MA4",
        nome: "Microárea 4",
        acs: "ACS Pedro",
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [-51.215, -30.072],
            [-51.209, -30.072],
            [-51.209, -30.079],
            [-51.215, -30.079],
            [-51.215, -30.072],
          ],
        ],
      },
    },
  ],
};
