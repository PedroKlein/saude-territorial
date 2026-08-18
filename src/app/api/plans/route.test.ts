/**
 * Tests for POST /api/plans and GET /api/plans + GET /api/plans/[id].
 *
 * Covers: happy-path create + list + load, auth gate (401), Zod-boundary
 * rejection (400).
 *
 * LGPD: all data is synthetic / fictitious.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => {
  const getSession = vi.fn();
  const transactionSpy = vi.fn();

  // Chainable select builder. Tests override `.then` via mockImplementationOnce.
  // Default: resolves with an empty array.
  let nextRows: unknown[] | null = null;
  const selectChain = {
    from: vi.fn(),
    where: vi.fn(),
    leftJoin: vi.fn(),
    groupBy: vi.fn(),
    orderBy: vi.fn(),
    limit: vi.fn(),
    then: vi.fn().mockImplementation((fn: (rows: unknown[]) => unknown) => {
      if (nextRows !== null) {
        const rows = nextRows;
        nextRows = null;
        return Promise.resolve(fn(rows));
      }
      return Promise.resolve(fn([]));
    }),
  };
  (["from", "where", "leftJoin", "groupBy", "orderBy", "limit"] as const).forEach(
    (k) => { selectChain[k].mockReturnValue(selectChain); },
  );

  // Chainable delete builder: db.delete(t).where(cond).returning(cols) → Promise<row[]>.
  const deleteReturning = vi.fn().mockResolvedValue([]);
  const deleteWhere = vi.fn().mockReturnValue({ returning: deleteReturning });
  const deleteFn = vi.fn().mockReturnValue({ where: deleteWhere });

  return {
    getSession,
    transactionSpy,
    selectChain,
    deleteFn,
    deleteReturning,
  };
});

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mocks.getSession } },
}));

vi.mock("@/db/client", () => ({
  db: {
    transaction: mocks.transactionSpy,
    select: vi.fn().mockReturnValue(mocks.selectChain),
    delete: mocks.deleteFn,
  },
}));

// ---------------------------------------------------------------------------
// Import modules under test AFTER mocks
// ---------------------------------------------------------------------------

import { POST, GET } from "@/app/api/plans/route";
import { GET as GET_ONE, DELETE as DELETE_ONE } from "@/app/api/plans/[id]/route";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const VALID_BODY = {
  date: "2025-08-13",
  acsName: "João ACS",
  profile: "foot",
  notes: null,
  stops: [
    { patientId: "550e8400-e29b-41d4-a716-446655440001", order: 1 },
    { patientId: "550e8400-e29b-41d4-a716-446655440002", order: 2 },
  ],
};

const PLAN_ROW = {
  id: "22222222-2222-4222-8222-222222222222",
  date: "2025-08-13",
  acsName: "João ACS",
  profile: "foot",
  notes: null,
  createdAt: new Date("2025-08-13T10:00:00Z"),
};

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/plans", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

function makeGet(url = "http://localhost/api/plans"): NextRequest {
  return new NextRequest(url, { method: "GET" });
}

// ---------------------------------------------------------------------------
// POST /api/plans
// ---------------------------------------------------------------------------

describe("POST /api/plans", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mocks.getSession.mockResolvedValueOnce(null);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 400 for empty stops array", async () => {
    mocks.getSession.mockResolvedValueOnce({ user: { id: "u1" } });
    const res = await POST(makePost({ ...VALID_BODY, stops: [] }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("returns 400 for invalid date format (dd/MM/yyyy rejected)", async () => {
    mocks.getSession.mockResolvedValueOnce({ user: { id: "u1" } });
    const res = await POST(makePost({ ...VALID_BODY, date: "13/08/2025" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid profile value", async () => {
    mocks.getSession.mockResolvedValueOnce({ user: { id: "u1" } });
    const res = await POST(makePost({ ...VALID_BODY, profile: "bike" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for non-UUID patientId in stops", async () => {
    mocks.getSession.mockResolvedValueOnce({ user: { id: "u1" } });
    const res = await POST(makePost({ ...VALID_BODY, stops: [{ patientId: "not-a-uuid", order: 1 }] }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for malformed JSON body", async () => {
    mocks.getSession.mockResolvedValueOnce({ user: { id: "u1" } });
    const req = new NextRequest("http://localhost/api/plans", {
      method: "POST",
      body: "not-json{{{",
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 201 with plan on happy path", async () => {
    mocks.getSession.mockResolvedValueOnce({ user: { id: "u1" } });
    mocks.transactionSpy.mockImplementationOnce(
      (fn: (tx: {
        insert: (t: unknown) => {
          values: (v: unknown) => { returning: () => Promise<typeof PLAN_ROW[]> }
        }
      }) => typeof PLAN_ROW) => {
        const tx = {
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([PLAN_ROW]),
            }),
          }),
        };
        return fn(tx);
      },
    );

    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.plan.id).toBe("22222222-2222-4222-8222-222222222222");
    expect(body.plan.profile).toBe("foot");
  });
});

// ---------------------------------------------------------------------------
// GET /api/plans
// ---------------------------------------------------------------------------

describe("GET /api/plans", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mocks.getSession.mockResolvedValueOnce(null);
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("returns 200 with plans array on happy path", async () => {
    mocks.getSession.mockResolvedValueOnce({ user: { id: "u1" } });

    // Reset chain so .then() resolves with our fixture.
    mocks.selectChain.then.mockImplementationOnce(
      (fn: (rows: unknown[]) => unknown) =>
        Promise.resolve(fn([{ ...PLAN_ROW, stopCount: 2 }])),
    );

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.plans)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// GET /api/plans/[id]
// ---------------------------------------------------------------------------

describe("GET /api/plans/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mocks.getSession.mockResolvedValueOnce(null);
    const res = await GET_ONE(makeGet("http://localhost/api/plans/plan-uuid-1"), {
      params: Promise.resolve({ id: "22222222-2222-4222-8222-222222222222" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 when plan not found", async () => {
    mocks.getSession.mockResolvedValueOnce({ user: { id: "u1" } });
    // First select: plan lookup → empty
    mocks.selectChain.then.mockImplementationOnce(
      (fn: (rows: unknown[]) => unknown) => Promise.resolve(fn([])),
    );

    const res = await GET_ONE(makeGet("http://localhost/api/plans/nonexistent"), {
      params: Promise.resolve({ id: "00000000-0000-4000-8000-000000000000" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 200 with plan + stops on happy path", async () => {
    mocks.getSession.mockResolvedValueOnce({ user: { id: "u1" } });

    // Plan lookup
    mocks.selectChain.then
      .mockImplementationOnce((fn: (rows: unknown[]) => unknown) =>
        Promise.resolve(fn([PLAN_ROW])),
      )
      // Stops lookup
      .mockImplementationOnce((fn: (rows: unknown[]) => unknown) =>
        Promise.resolve(
          fn([{ patientId: "550e8400-e29b-41d4-a716-446655440001", order: 1 }]),
        ),
      );

    const res = await GET_ONE(makeGet("http://localhost/api/plans/plan-uuid-1"), {
      params: Promise.resolve({ id: "22222222-2222-4222-8222-222222222222" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.plan.id).toBe("22222222-2222-4222-8222-222222222222");
    expect(Array.isArray(body.plan.stops)).toBe(true);
    expect(body.plan.stops).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/plans/[id]
// ---------------------------------------------------------------------------

function makeDelete(url: string): NextRequest {
  return new NextRequest(url, { method: "DELETE" });
}

describe("DELETE /api/plans/[id]", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mocks.getSession.mockResolvedValueOnce(null);
    const res = await DELETE_ONE(
      makeDelete("http://localhost/api/plans/plan-uuid-1"),
      { params: Promise.resolve({ id: "22222222-2222-4222-8222-222222222222" }) },
    );
    expect(res.status).toBe(401);
    expect(mocks.deleteFn).not.toHaveBeenCalled();
  });

  it("returns 404 when no row matches", async () => {
    mocks.getSession.mockResolvedValueOnce({ user: { id: "u1" } });
    mocks.deleteReturning.mockResolvedValueOnce([]);

    const res = await DELETE_ONE(
      makeDelete("http://localhost/api/plans/nonexistent"),
      { params: Promise.resolve({ id: "00000000-0000-4000-8000-000000000000" }) },
    );
    expect(res.status).toBe(404);
  });

  it("returns 204 on happy path", async () => {
    mocks.getSession.mockResolvedValueOnce({ user: { id: "u1" } });
    mocks.deleteReturning.mockResolvedValueOnce([{ id: "22222222-2222-4222-8222-222222222222" }]);

    const res = await DELETE_ONE(
      makeDelete("http://localhost/api/plans/plan-uuid-1"),
      { params: Promise.resolve({ id: "22222222-2222-4222-8222-222222222222" }) },
    );
    expect(res.status).toBe(204);
    expect(mocks.deleteFn).toHaveBeenCalledTimes(1);
  });
});
