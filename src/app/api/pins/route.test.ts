import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock Supabase client
vi.mock("@/lib/supabase/server", () => ({
  createClient: () => Promise.resolve({
    from: () => ({
      select: () => ({
        eq: () => ({
          data: [
            { id: "pin-1", patient_cns: "000000000000001", lat: -30.03, lng: -51.22, reference_text: "Perto do mercado" },
          ],
          error: null,
        }),
      }),
      insert: () => ({
        select: () => ({
          single: () => ({ data: { id: "pin-new", patient_cns: "000000000000002", lat: -30.04, lng: -51.23, reference_text: "Próximo à escola" }, error: null }),
        }),
      }),
      delete: () => ({
        eq: () => ({
          eq: () => ({ error: null }),
        }),
      }),
    }),
  }),
}));

// Mock auth
vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: () => Promise.resolve({ user: { id: "user-1" } }),
    },
  },
}));

import { GET, POST, DELETE } from "./route";

describe("/api/pins", () => {
  it("GET returns list of user pins", async () => {
    const req = new NextRequest("http://localhost:3000/api/pins");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.pins).toHaveLength(1);
    expect(data.pins[0].patient_cns).toBe("000000000000001");
  });

  it("POST creates a pin with valid data", async () => {
    const req = new NextRequest("http://localhost:3000/api/pins", {
      method: "POST",
      body: JSON.stringify({
        patient_cns: "000000000000002",
        lat: -30.04,
        lng: -51.23,
        reference_text: "Próximo à escola",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.pin).toBeDefined();
    expect(data.pin.patient_cns).toBe("000000000000002");
  });

  it("POST returns 400 for invalid data (missing lat)", async () => {
    const req = new NextRequest("http://localhost:3000/api/pins", {
      method: "POST",
      body: JSON.stringify({
        patient_cns: "000000000000003",
        lng: -51.23,
        reference_text: "Sem latitude",
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("DELETE removes a pin", async () => {
    const req = new NextRequest("http://localhost:3000/api/pins?id=pin-1", {
      method: "DELETE",
    });
    const res = await DELETE(req);
    expect(res.status).toBe(200);
  });
});
