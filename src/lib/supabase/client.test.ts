/**
 * TDD Red Phase — Supabase browser client contract
 *
 * These tests define the expected shape of lib/supabase/client.ts.
 * They will FAIL until the implementation is written.
 *
 * Contracts:
 *  - `createClient` is exported and is a function
 *  - It calls `createBrowserClient` from @supabase/ssr with the two
 *    public env vars: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 *  - It returns the object produced by `createBrowserClient` (a valid client)
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
  createBrowserClient: vi.fn(() => mockClient),
}));

// ---------------------------------------------------------------------------
// Env var stubs
// ---------------------------------------------------------------------------

const TEST_URL = "https://test-project.supabase.co";
const TEST_ANON_KEY = "test-anon-key-abc123";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("lib/supabase/client — createClient (browser)", () => {
  beforeEach(() => {
    vi.resetModules();
    // Provide env vars for each test run
    process.env.NEXT_PUBLIC_SUPABASE_URL = TEST_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = TEST_ANON_KEY;
  });

  it("exports a createClient function", async () => {
    const mod = await import("@/lib/supabase/client");
    expect(mod).toHaveProperty("createClient");
    expect(typeof mod.createClient).toBe("function");
  });

  it("returns the client object produced by createBrowserClient", async () => {
    const mod = await import("@/lib/supabase/client");
    const client = mod.createClient();
    expect(client).toBe(mockClient);
  });

  it("calls createBrowserClient with NEXT_PUBLIC_SUPABASE_URL", async () => {
    const { createBrowserClient } = await import("@supabase/ssr");
    const mod = await import("@/lib/supabase/client");

    mod.createClient();

    expect(vi.mocked(createBrowserClient)).toHaveBeenCalledWith(
      TEST_URL,
      expect.any(String)
    );
  });

  it("calls createBrowserClient with NEXT_PUBLIC_SUPABASE_ANON_KEY", async () => {
    const { createBrowserClient } = await import("@supabase/ssr");
    const mod = await import("@/lib/supabase/client");

    mod.createClient();

    expect(vi.mocked(createBrowserClient)).toHaveBeenCalledWith(
      expect.any(String),
      TEST_ANON_KEY
    );
  });

  it("returns a client with a `from` method (basic duck-type check)", async () => {
    const mod = await import("@/lib/supabase/client");
    const client = mod.createClient();
    expect(client).toHaveProperty("from");
    expect(typeof client.from).toBe("function");
  });

  it("returns a client with an `auth` property (basic duck-type check)", async () => {
    const mod = await import("@/lib/supabase/client");
    const client = mod.createClient();
    expect(client).toHaveProperty("auth");
    expect(typeof client.auth).toBe("object");
  });
});
