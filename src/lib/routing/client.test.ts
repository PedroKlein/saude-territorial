import { describe, it, expect, vi, beforeEach } from "vitest";
import { getRoute } from "./client";

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("getRoute", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("returns route result on successful OSRM response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          code: "Ok",
          routes: [
            {
              distance: 1500,
              duration: 600,
              geometry: {
                type: "LineString",
                coordinates: [
                  [-51.2177, -30.0346],
                  [-51.2100, -30.0400],
                ],
              },
            },
          ],
        }),
    });

    const result = await getRoute(
      [
        { lat: -30.0346, lng: -51.2177 },
        { lat: -30.0400, lng: -51.2100 },
      ],
      "foot",
    );

    expect(result.distance).toBe(1500);
    expect(result.duration).toBe(600);
    expect(result.geometry.type).toBe("LineString");
    expect(result.geometry.coordinates).toHaveLength(2);

    // Verify OSRM URL uses lng,lat order and 'foot' profile
    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/route/v1/foot/");
    expect(calledUrl).toContain("-51.2177,-30.0346");
  });

  it("throws on OSRM error response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          code: "InvalidInput",
          message: "Invalid coordinates",
        }),
    });

    await expect(
      getRoute(
        [
          { lat: -30.0346, lng: -51.2177 },
          { lat: 999, lng: 999 },
        ],
        "car",
      ),
    ).rejects.toThrow("OSRM");
  });

  it("throws on network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network failure"));

    await expect(
      getRoute(
        [
          { lat: -30.0346, lng: -51.2177 },
          { lat: -30.0400, lng: -51.2100 },
        ],
        "foot",
      ),
    ).rejects.toThrow("Network failure");
  });

  it("maps 'car' profile to 'driving' in OSRM URL", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          code: "Ok",
          routes: [
            {
              distance: 2000,
              duration: 300,
              geometry: { type: "LineString", coordinates: [[-51.2, -30.0]] },
            },
          ],
        }),
    });

    await getRoute(
      [
        { lat: -30.0346, lng: -51.2177 },
        { lat: -30.0400, lng: -51.2100 },
      ],
      "car",
    );

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("/route/v1/driving/");
  });

  it("throws when fewer than 2 waypoints are supplied", async () => {
    await expect(
      getRoute([{ lat: -30.0346, lng: -51.2177 }], "foot"),
    ).rejects.toThrow(/at least 2 waypoints/);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("chains 3+ waypoints as semicolon-separated coordinates in lng,lat order", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          code: "Ok",
          routes: [
            {
              distance: 3000,
              duration: 900,
              geometry: {
                type: "LineString",
                coordinates: [
                  [-51.22, -30.03],
                  [-51.21, -30.04],
                  [-51.20, -30.05],
                ],
              },
            },
          ],
        }),
    });

    await getRoute(
      [
        { lat: -30.03, lng: -51.22 },
        { lat: -30.04, lng: -51.21 },
        { lat: -30.05, lng: -51.20 },
      ],
      "foot",
    );

    const calledUrl = mockFetch.mock.calls[0][0] as string;
    expect(calledUrl).toContain("-51.22,-30.03;-51.21,-30.04;-51.2,-30.05");
  });
});
