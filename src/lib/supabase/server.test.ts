/**
 * TDD Red Phase — Supabase server client contract
 *
 * These tests define the expected shape of lib/supabase/server.ts.
 * They will FAIL until the implementation is written.
 *
 * Contracts:
 *  - `createClient` is exported and is an async function
 *  - It calls `createServerClient` from @supabase/ssr with the two
 *    env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 *  - It passes a cookie adapter with `getAll` and `setAll` methods
 *    (never individual get/set/remove — those break chunked cookies)
 *  - It returns the object produced by `createServerClient` (a valid client)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Top-level vi.mock() calls — Vitest hoists these before any imports.
// Must live at module scope, never inside describe/beforeEach/it.
// ---------------------------------------------------------------------------

const mockClient = {
  from: vi.fn(),
  auth: { getUser: vi.fn(), getSession: vi.fn() },
};

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => mockClient),
}));

// Mock next/headers — server client reads cookies from the request context
vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    getAll: vi.fn().mockReturnValue([]),
    set: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Env var stubs
// ---------------------------------------------------------------------------

const TEST_URL = "https://test-project.supabase.co";
const TEST_ANON_KEY = "test-anon-key-abc123";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("lib/supabase/server — createClient (server)", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_SUPABASE_URL = TEST_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = TEST_ANON_KEY;
  });

  it("exports a createClient function", async () => {
    const mod = await import("@/lib/supabase/server");
    expect(mod).toHaveProperty("createClient");
    expect(typeof mod.createClient).toBe("function");
  });

  it("createClient is async (returns a Promise)", async () => {
    const mod = await import("@/lib/supabase/server");
    const result = mod.createClient();
    expect(result).toBeInstanceOf(Promise);
  });

  it("returns the client object produced by createServerClient", async () => {
    const mod = await import("@/lib/supabase/server");
    const client = await mod.createClient();
    expect(client).toBe(mockClient);
  });

  it("calls createServerClient with NEXT_PUBLIC_SUPABASE_URL", async () => {
    const { createServerClient } = await import("@supabase/ssr");
    const mod = await import("@/lib/supabase/server");

    await mod.createClient();

    expect(vi.mocked(createServerClient)).toHaveBeenCalledWith(
      TEST_URL,
      expect.any(String),
      expect.any(Object)
    );
  });

  it("calls createServerClient with NEXT_PUBLIC_SUPABASE_ANON_KEY", async () => {
    const { createServerClient } = await import("@supabase/ssr");
    const mod = await import("@/lib/supabase/server");

    await mod.createClient();

    expect(vi.mocked(createServerClient)).toHaveBeenCalledWith(
      expect.any(String),
      TEST_ANON_KEY,
      expect.any(Object)
    );
  });

  it("passes a cookies adapter object as the third argument", async () => {
    const { createServerClient } = await import("@supabase/ssr");
    const mod = await import("@/lib/supabase/server");

    await mod.createClient();

    const thirdArg = vi.mocked(createServerClient).mock.calls[0][2] as {
      cookies?: unknown;
    };
    expect(thirdArg).toHaveProperty("cookies");
    expect(typeof thirdArg.cookies).toBe("object");
  });

  it("cookie adapter exposes a getAll method (not individual get)", async () => {
    const { createServerClient } = await import("@supabase/ssr");
    const mod = await import("@/lib/supabase/server");

    await mod.createClient();

    const thirdArg = vi.mocked(createServerClient).mock.calls[0][2] as {
      cookies: { getAll?: unknown; get?: unknown };
    };
    expect(typeof thirdArg.cookies.getAll).toBe("function");
    // Deprecated individual `get` must NOT be used
    expect(thirdArg.cookies).not.toHaveProperty("get");
  });

  it("cookie adapter exposes a setAll method (not individual set/remove)", async () => {
    const { createServerClient } = await import("@supabase/ssr");
    const mod = await import("@/lib/supabase/server");

    await mod.createClient();

    const thirdArg = vi.mocked(createServerClient).mock.calls[0][2] as {
      cookies: { setAll?: unknown; set?: unknown; remove?: unknown };
    };
    expect(typeof thirdArg.cookies.setAll).toBe("function");
    // Deprecated individual methods must NOT be used
    expect(thirdArg.cookies).not.toHaveProperty("set");
    expect(thirdArg.cookies).not.toHaveProperty("remove");
  });

  it("returns a client with a `from` method (basic duck-type check)", async () => {
    const mod = await import("@/lib/supabase/server");
    const client = await mod.createClient();
    expect(client).toHaveProperty("from");
    expect(typeof client.from).toBe("function");
  });

  it("returns a client with an `auth` property (basic duck-type check)", async () => {
    const mod = await import("@/lib/supabase/server");
    const client = await mod.createClient();
    expect(client).toHaveProperty("auth");
    expect(typeof client.auth).toBe("object");
  });
});
