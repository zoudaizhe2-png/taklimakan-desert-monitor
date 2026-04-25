import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock LanguageContext (returns key as label so we can assert against keys)
vi.mock("../i18n/LanguageContext", () => ({
  useLanguage: () => ({ t: (key) => key, lang: "en" }),
}));

// Mock AuthContext — unauthenticated by default
vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({ user: null }),
}));

// Mock react-icons (any tag works for tests)
vi.mock("react-icons/fi", () => {
  const Icon = (props) => <span data-testid="icon" {...props} />;
  return {
    FiInbox: Icon,
    FiRefreshCw: Icon,
    FiCheck: Icon,
    FiX: Icon,
    FiClock: Icon,
    FiSkipForward: Icon,
    FiPlayCircle: Icon,
    FiAlertTriangle: Icon,
    FiChevronDown: Icon,
    FiExternalLink: Icon,
    FiInfo: Icon,
  };
});

// Mock the api client functions used by DecisionCenterView
const mockFetchRecommendations = vi.fn();
const mockFetchActionCatalog = vi.fn();
const mockDecideRecommendation = vi.fn();
const mockEvaluateRegion = vi.fn();

vi.mock("../api/client", () => ({
  fetchRecommendations: (...args) => mockFetchRecommendations(...args),
  fetchActionCatalog: (...args) => mockFetchActionCatalog(...args),
  decideRecommendation: (...args) => mockDecideRecommendation(...args),
  evaluateRegion: (...args) => mockEvaluateRegion(...args),
  ApiError: class ApiError extends Error {
    constructor(msg, status) {
      super(msg);
      this.status = status;
      this.name = "ApiError";
    }
  },
}));

import DecisionCenterView from "../components/DecisionCenterView";

const SAMPLE_RECS = [
  {
    id: 1,
    action_code: "PLANT_HALOXYLON",
    feature_id: "hotan_green_belt",
    confidence: 0.78,
    estimated_cost_yuan: 3675000,
    eta_months: 36,
    approval_level: "project_office",
    status: "pending",
    trigger_data_snapshot: '{"ndvi": 0.12, "rainfall": 80}',
    output_params: "{}",
    engine_note: null,
  },
  {
    id: 2,
    action_code: "ALERT_NDVI_DEGRADATION",
    feature_id: "alar_shelterbelt",
    confidence: 0.82,
    estimated_cost_yuan: null,
    eta_months: 0,
    approval_level: "local",
    status: "approved",
    trigger_data_snapshot: '{"ndvi": 0.13}',
    output_params: "{}",
    engine_note: null,
  },
  {
    id: 3,
    action_code: "INSPECT_DRONE",
    feature_id: null,
    confidence: 0.81,
    estimated_cost_yuan: null,
    eta_months: 0,
    approval_level: "local",
    status: "pending",
    trigger_data_snapshot: '{"ndvi": 0.18}',
    output_params: "{}",
    engine_note: null,
  },
];

const SAMPLE_CATALOG = {
  total: 3,
  actions: [
    { code: "PLANT_HALOXYLON", name_en: "Plant saxaul", name_zh: "推荐种植梭梭", description_en: "Plant saxaul" },
    { code: "ALERT_NDVI_DEGRADATION", name_en: "NDVI alert", name_zh: "NDVI 异常退化预警", description_en: "Alert" },
    { code: "INSPECT_DRONE", name_en: "Drone survey", name_zh: "无人机巡检", description_en: "Drone" },
  ],
};

describe("DecisionCenterView", () => {
  beforeEach(() => {
    mockFetchRecommendations.mockReset();
    mockFetchActionCatalog.mockReset();
    mockDecideRecommendation.mockReset();
    mockEvaluateRegion.mockReset();
    mockFetchRecommendations.mockResolvedValue(SAMPLE_RECS);
    mockFetchActionCatalog.mockResolvedValue(SAMPLE_CATALOG);
  });

  it("renders 3 cards from fetched recommendations and shows filter rows", async () => {
    render(<DecisionCenterView />);

    await waitFor(() => {
      expect(screen.getAllByRole("article").length).toBe(3);
    });

    // Action codes appear on each card
    expect(screen.getByText("PLANT_HALOXYLON")).toBeInTheDocument();
    expect(screen.getByText("ALERT_NDVI_DEGRADATION")).toBeInTheDocument();
    expect(screen.getByText("INSPECT_DRONE")).toBeInTheDocument();

    // Filter chip groups all rendered (status / category / approval)
    expect(screen.getByLabelText("dc_filter_status")).toBeInTheDocument();
    expect(screen.getByLabelText("dc_filter_category")).toBeInTheDocument();
    expect(screen.getByLabelText("dc_filter_approval")).toBeInTheDocument();

    // First fetch had no status filter
    expect(mockFetchRecommendations).toHaveBeenCalled();
    const firstCallFilters = mockFetchRecommendations.mock.calls[0][0];
    expect(firstCallFilters.status).toBeUndefined();
  });

  it("clicking a status chip triggers a refetch with the new status filter", async () => {
    render(<DecisionCenterView />);

    await waitFor(() => {
      expect(screen.getAllByRole("article").length).toBe(3);
    });

    expect(mockFetchRecommendations).toHaveBeenCalledTimes(1);

    // Find the "approved" status chip inside the status row group
    const statusGroup = screen.getByLabelText("dc_filter_status");
    const approvedChip = Array.from(statusGroup.querySelectorAll("button")).find((b) =>
      b.textContent.includes("dc_status_approved")
    );
    expect(approvedChip).toBeDefined();

    fireEvent.click(approvedChip);

    await waitFor(() => {
      expect(mockFetchRecommendations).toHaveBeenCalledTimes(2);
    });
    const lastCallFilters = mockFetchRecommendations.mock.calls.at(-1)[0];
    expect(lastCallFilters.status).toBe("approved");

    // The clicked chip is now aria-pressed=true
    expect(approvedChip.getAttribute("aria-pressed")).toBe("true");
  });
});
