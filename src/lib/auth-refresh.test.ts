import { describe, it, expect, vi, beforeEach } from "vitest";
import { withTokenRefresh, TokenExpiredError } from "@/lib/auth-refresh";

// Mock the auth module
vi.mock("@/lib/auth", () => ({
  getGoogleAccessToken: vi.fn(),
  auth: {},
}));

// Mock googleapis
vi.mock("googleapis", () => {
  class MockOAuth2 {
    setCredentials() {}
  }
  return {
    google: {
      auth: {
        OAuth2: MockOAuth2,
      },
    },
  };
});

import { getGoogleAccessToken } from "@/lib/auth";

const mockGetToken = vi.mocked(getGoogleAccessToken);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("withTokenRefresh", () => {
  it("returns result on first successful call", async () => {
    mockGetToken.mockResolvedValue("valid-token");
    const fn = vi.fn().mockResolvedValue("result-data");

    const result = await withTokenRefresh(fn);

    expect(result).toBe("result-data");
    expect(fn).toHaveBeenCalledTimes(1);
    expect(mockGetToken).toHaveBeenCalledTimes(1);
  });

  it("retries once on 401 with refreshed token", async () => {
    mockGetToken
      .mockResolvedValueOnce("stale-token")
      .mockResolvedValueOnce("fresh-token");

    const fn = vi
      .fn()
      .mockRejectedValueOnce({ response: { status: 401 } })
      .mockResolvedValueOnce("success-after-refresh");

    const result = await withTokenRefresh(fn);

    expect(result).toBe("success-after-refresh");
    expect(fn).toHaveBeenCalledTimes(2);
    expect(mockGetToken).toHaveBeenCalledTimes(2);
  });

  it("throws TokenExpiredError when retry also returns 401", async () => {
    mockGetToken.mockResolvedValue("token");

    const fn = vi.fn().mockRejectedValue({ response: { status: 401 } });

    await expect(withTokenRefresh(fn)).rejects.toBeInstanceOf(
      TokenExpiredError
    );
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws non-401 errors immediately without retry", async () => {
    mockGetToken.mockResolvedValue("token");

    const fn = vi
      .fn()
      .mockRejectedValue({ response: { status: 403 } });

    await expect(withTokenRefresh(fn)).rejects.toMatchObject({
      response: { status: 403 },
    });
    expect(fn).toHaveBeenCalledTimes(1); // No retry
  });

  it("throws TokenExpiredError when getGoogleAccessToken fails", async () => {
    mockGetToken.mockRejectedValue(new Error("No token"));

    const fn = vi.fn();

    await expect(withTokenRefresh(fn)).rejects.toBeInstanceOf(
      TokenExpiredError
    );
    expect(fn).not.toHaveBeenCalled(); // Never reached
  });
});
