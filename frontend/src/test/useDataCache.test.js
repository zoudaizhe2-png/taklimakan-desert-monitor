import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import useDataCache, { setCacheEntry, hasCacheEntry, clearCache } from "../hooks/useDataCache";

beforeEach(() => {
  clearCache();
});

describe("useDataCache", () => {
  it("returns loading true then data after fetch", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ value: 42 });
    const { result } = renderHook(() => useDataCache("test-key", fetchFn));

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual({ value: 42 });
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it("returns cached data immediately on second mount", async () => {
    const fetchFn = vi.fn().mockResolvedValue("cached-val");
    const { result, unmount } = renderHook(() => useDataCache("reuse", fetchFn));
    await waitFor(() => expect(result.current.data).toBe("cached-val"));
    unmount();

    // Second mount — should get data immediately
    const { result: result2 } = renderHook(() => useDataCache("reuse", fetchFn));
    expect(result2.current.loading).toBe(false);
    expect(result2.current.data).toBe("cached-val");
  });

  it("handles fetch failure gracefully", async () => {
    const fetchFn = vi.fn().mockRejectedValue(new Error("fail"));
    const { result } = renderHook(() => useDataCache("fail-key", fetchFn));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toBeNull();
  });
});

describe("setCacheEntry / hasCacheEntry", () => {
  it("manually sets and checks a cache entry", () => {
    expect(hasCacheEntry("manual")).toBe(false);
    setCacheEntry("manual", "data");
    expect(hasCacheEntry("manual")).toBe(true);
  });
});

describe("LRU eviction", () => {
  it("evicts oldest when exceeding max entries", () => {
    for (let i = 0; i < 51; i++) {
      setCacheEntry(`key-${i}`, i);
    }
    // key-0 should have been evicted
    expect(hasCacheEntry("key-0")).toBe(false);
    expect(hasCacheEntry("key-50")).toBe(true);
  });
});
