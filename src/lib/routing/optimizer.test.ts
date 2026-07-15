import { describe, it, expect, vi, beforeEach } from "vitest";
import { optimizeRoute } from "./optimizer";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("optimizeRoute", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("returns optimized route with correct order for 3 waypoints", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          code: "Ok",
          trips: [
            {
              distance: 5200,
              duration: 900,
              geometry: {
                type: "LineString",
                coordinates: [
                  [-51.17, -30.05],
                  [-51.22, -30.07],
                  [-51.23, -30.08],
                ],
              },
            },
          ],
          waypoints: [
            { waypoint_index: 0, location: [-51.17, -30.05] },
            { waypoint_index: 2, location: [-51.23, -30.08] },
            { waypoint_index: 1, location: [-51.22, -30.07] },
          ],
        }),
    });

    const result = await optimizeRoute(
      [
        { lat: -30.07, lng: -51.22 },
        { lat: -30.08, lng: -51.23 },
      ],
      { lat: -30.05, lng: -51.17 }
    );

    expect(result.totalDistance).toBe(5200);
    expect(result.totalDuration).toBe(900);
    expect(result.geometry.type).toBe("LineString");
    expect(result.optimizedOrder).toEqual([2, 1]);
  });

  it("throws on OSRM error response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          code: "NoTrips",
          message: "No matching trip found",
        }),
    });

    await expect(
      optimizeRoute(
        [{ lat: -30.07, lng: -51.22 }],
        { lat: -30.05, lng: -51.17 }
      )
    ).rejects.toThrow("OSRM");
  });

  it("throws on network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    await expect(
      optimizeRoute(
        [{ lat: -30.07, lng: -51.22 }],
        { lat: -30.05, lng: -51.17 }
      )
    ).rejects.toThrow("Network error");
  });

  it("constructs correct OSRM trip URL with source=first", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          code: "Ok",
          trips: [{ distance: 1000, duration: 200, geometry: { type: "LineString", coordinates: [] } }],
          waypoints: [
            { waypoint_index: 0, location: [-51.17, -30.05] },
            { waypoint_index: 1, location: [-51.22, -30.07] },
          ],
        }),
    });

    await optimizeRoute(
      [{ lat: -30.07, lng: -51.22 }],
      { lat: -30.05, lng: -51.17 }
    );

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/trip/v1/driving/");
    expect(calledUrl).toContain("source=first");
    expect(calledUrl).toContain("geometries=geojson");
    // Origin (lng,lat) should be first coordinate
    expect(calledUrl).toContain("-51.17,-30.05");
  });
});
