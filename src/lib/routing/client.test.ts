import { describe, it, expect, vi, beforeEach } from "vitest";
import { getRoute, getTrip } from "./client";

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
    // Foot profile overrides duration with walking-speed math because the
    // OSRM demo doesn't run the foot profile. 1500 m ÷ (4500/3600) m/s = 1200 s.
    // See lib/routing/client.ts for the rationale.
    expect(result.duration).toBe(1200);
    expect(result.geometry.type).toBe("LineString");
    expect(result.geometry.coordinates).toHaveLength(2);

    // Verify OSRM URL uses lng,lat order and 'foot' profile
    const calledUrl = mockFetch.mock.calls[0]![0]! as string;
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

  it("maps 'car' profile to 'driving' in OSRM URL and passes duration through", async () => {
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

    const result = await getRoute(
      [
        { lat: -30.0346, lng: -51.2177 },
        { lat: -30.0400, lng: -51.2100 },
      ],
      "car",
    );

    const calledUrl = mockFetch.mock.calls[0]![0]! as string;
    expect(calledUrl).toContain("/route/v1/driving/");
    // Car profile trusts OSRM's duration verbatim (no walking override).
    expect(result.duration).toBe(300);
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

    const calledUrl = mockFetch.mock.calls[0]![0]! as string;
    expect(calledUrl).toContain("-51.22,-30.03;-51.21,-30.04;-51.2,-30.05");
  });
});

describe("getTrip", () => {
  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("permutes input indices into visit order and passes source/destination anchors", async () => {
    // Simulate OSRM's /trip response: waypoint_index[i] is the position of
    // input i in the optimized order. Input order: [A, B, C]. Optimized:
    // A first, C second, B third — so waypoint_index = [0, 2, 1].
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          code: "Ok",
          trips: [
            {
              distance: 2000,
              duration: 400,
              geometry: { type: "LineString", coordinates: [[-51.2, -30.0]] },
            },
          ],
          waypoints: [
            { waypoint_index: 0 },
            { waypoint_index: 2 },
            { waypoint_index: 1 },
          ],
        }),
    });

    const result = await getTrip(
      [
        { lat: -30.03, lng: -51.22 }, // input 0 -> visit position 0
        { lat: -30.04, lng: -51.21 }, // input 1 -> visit position 2
        { lat: -30.05, lng: -51.20 }, // input 2 -> visit position 1
      ],
      "car",
    );

    // Optimized visit order (0-indexed by output position): input 0, 2, 1.
    expect(result.order).toEqual([0, 2, 1]);
    expect(result.distance).toBe(2000);
    expect(result.duration).toBe(400);

    // Verify OSRM URL uses source=first, destination=last, roundtrip=false.
    const calledUrl = mockFetch.mock.calls[0]![0]! as string;
    expect(calledUrl).toContain("/trip/v1/driving/");
    expect(calledUrl).toContain("source=first");
    expect(calledUrl).toContain("destination=last");
    expect(calledUrl).toContain("roundtrip=false");
  });

  it("applies walking-speed override on foot profile", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          code: "Ok",
          trips: [
            {
              distance: 900,
              duration: 180, // OSRM driving time — ignored on foot
              geometry: { type: "LineString", coordinates: [] },
            },
          ],
          waypoints: [
            { waypoint_index: 0 },
            { waypoint_index: 1 },
            { waypoint_index: 2 },
          ],
        }),
    });

    const result = await getTrip(
      [
        { lat: 0, lng: 0 },
        { lat: 0, lng: 0 },
        { lat: 0, lng: 0 },
      ],
      "foot",
    );
    // 900 m ÷ (4500/3600) = 720 s.
    expect(result.duration).toBe(720);
  });

  it("throws when fewer than 3 waypoints are supplied", async () => {
    await expect(
      getTrip([{ lat: 0, lng: 0 }, { lat: 1, lng: 1 }], "foot"),
    ).rejects.toThrow(/at least 3 waypoints/);
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
