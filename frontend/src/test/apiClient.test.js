import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import {
  fetchRecommendations,
  decideRecommendation,
  fetchActionCatalog,
  clearActionCatalogCache,
} from "../api/client";

const ORIG_FETCH = globalThis.fetch;

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  };
}

beforeEach(() => {
  localStorage.clear();
  clearActionCatalogCache();
  globalThis.fetch = vi.fn();
});

afterEach(() => {
  globalThis.fetch = ORIG_FETCH;
});

describe("api/client — fetchRecommendations querystring", () => {
  it("appends only the provided filter params + the default limit", async () => {
    globalThis.fetch.mockResolvedValueOnce(jsonResponse([]));

    await fetchRecommendations({
      status: "pending",
      action_code: "PLANT_HALOXYLON",
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    const url = globalThis.fetch.mock.calls[0][0];
    expect(url).toContain("/recommendations?");
    expect(url).toContain("status=pending");
    expect(url).toContain("action_code=PLANT_HALOXYLON");
    expect(url).toContain("limit=50");
    // approval_level was not provided — must NOT appear
    expect(url).not.toContain("approval_level=");
  });
});

describe("api/client — decideRecommendation", () => {
  it("posts the decision body and includes Bearer auth header from localStorage", async () => {
    localStorage.setItem("auth_token", "test-jwt-token");
    globalThis.fetch.mockResolvedValueOnce(jsonResponse({ id: 7, status: "approved" }));

    const result = await decideRecommendation(7, {
      decision: "approved",
      notes: "Looks good.",
    });

    expect(result.id).toBe(7);
    const [url, opts] = globalThis.fetch.mock.calls[0];
    expect(url).toContain("/recommendations/7/decision");
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body)).toEqual({
      decision: "approved",
      notes: "Looks good.",
    });
    expect(opts.headers.Authorization).toBe("Bearer test-jwt-token");
    expect(opts.headers["Content-Type"]).toBe("application/json");
  });
});

describe("api/client — fetchActionCatalog cache", () => {
  it("does not refetch within the 5-minute TTL window", async () => {
    globalThis.fetch.mockResolvedValueOnce(
      jsonResponse({ total: 1, actions: [{ code: "PLANT_HALOXYLON" }] })
    );

    const first = await fetchActionCatalog();
    expect(first.total).toBe(1);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    // Second call — should hit the in-memory cache, not fetch.
    const second = await fetchActionCatalog();
    expect(second.total).toBe(1);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
});
