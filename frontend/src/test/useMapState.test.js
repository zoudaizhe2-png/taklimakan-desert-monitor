import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { clearCache } from "../hooks/useDataCache";

// Mock the API client
vi.mock("../api/client", () => ({
  fetchFeatures: vi.fn().mockResolvedValue([
    { id: "f1", name_en: "Hotan Belt", name_zh: "和田", category: "vegetation", geometry: null },
    { id: "f2", name_en: "Central Dunes", name_zh: "中部沙丘", category: "desert", geometry: null },
    { id: "f3", name_en: "Korla City", name_zh: "库尔勒", category: "city", geometry: null },
  ]),
  fetchTimeseries: vi.fn().mockResolvedValue({ data: [{ year: 2020, mean_ndvi: 0.3 }] }),
  fetchAnalysis: vi.fn().mockResolvedValue({ data: { mean_change: 0.05 } }),
  fetchGrid: vi.fn().mockResolvedValue({ data: [{ lat: 37, lng: 80, ndvi: 0.3 }] }),
  fetchNdviGridCache: vi.fn().mockResolvedValue({ status: "ready", data: [] }),
}));

import useMapState from "../hooks/useMapState";

beforeEach(() => {
  clearCache();
});

describe("useMapState", () => {
  it("loads features and provides them as filtered list", async () => {
    const goToMap = vi.fn();
    const { result } = renderHook(() => useMapState(goToMap));

    await waitFor(() => expect(result.current.features.length).toBe(3));
    expect(result.current.filteredFeatures.length).toBe(3);
  });

  it("filters features by search query", async () => {
    const { result } = renderHook(() => useMapState(vi.fn()));
    await waitFor(() => expect(result.current.features.length).toBe(3));

    act(() => result.current.setSearchQuery("Hotan"));
    expect(result.current.filteredFeatures.length).toBe(1);
    expect(result.current.filteredFeatures[0].id).toBe("f1");
  });

  it("filters features by toggling category", async () => {
    const { result } = renderHook(() => useMapState(vi.fn()));
    await waitFor(() => expect(result.current.features.length).toBe(3));

    act(() => result.current.handleToggleFilter("desert"));
    expect(result.current.filteredFeatures.length).toBe(2);
    expect(result.current.filteredFeatures.find((f) => f.category === "desert")).toBeUndefined();
  });
});
