const API_BASE = import.meta.env.DEV ? "http://localhost:8000/api" : "/api";
const API_V1 = import.meta.env.DEV ? "http://localhost:8000/api/v1" : "/api/v1";

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function getAuthHeaders() {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}, signal, base = API_BASE) {
  const controller = signal ? undefined : new AbortController();
  const effectiveSignal = signal || controller?.signal;
  const timeoutId = controller ? setTimeout(() => controller.abort(), 30000) : undefined;

  try {
    const res = await fetch(`${base}${path}`, {
      ...options,
      headers: { ...getAuthHeaders(), ...options.headers },
      signal: effectiveSignal,
    });

    if (!res.ok) {
      let data = null;
      try { data = await res.json(); } catch { /* ignore */ }
      const msg = res.status === 429
        ? "Too many requests — please wait a moment"
        : (data?.detail || `Request failed (${res.status})`);
      throw new ApiError(msg, res.status, data);
    }

    return await res.json();
  } catch (err) {
    if (err.name === "AbortError") {
      throw new ApiError("Request timed out or was cancelled", 0, null);
    }
    if (err instanceof ApiError) throw err;
    const msg = err.message === "Failed to fetch"
      ? "Cannot connect to server — is the backend running?"
      : (err.message || "Network error");
    throw new ApiError(msg, 0, null);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export async function fetchPresets(signal) {
  return request("/presets", {}, signal);
}

export async function fetchTimeseries(geometry, startYear = 2015, endYear = new Date().getFullYear(), signal) {
  return request("/timeseries", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      geometry,
      start_year: startYear,
      end_year: endYear,
    }),
  }, signal);
}

export async function fetchAnalysis(geometry, year1, year2, signal) {
  return request("/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ geometry, year1, year2 }),
  }, signal);
}

export async function fetchGrid(geometry, year, resolution = 40, signal) {
  return request("/grid", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ geometry, year, resolution }),
  }, signal);
}

export async function fetchFeatures(category = null, search = null, signal) {
  const params = new URLSearchParams();
  if (category) params.append("category", category);
  if (search) params.append("search", search);
  return request(`/features?${params}`, {}, signal);
}

export async function fetchFeatureById(id, signal) {
  return request(`/features/${id}`, {}, signal);
}

export async function fetchDashboard(signal) {
  return request("/dashboard", {}, signal);
}

export async function fetchRegionalDashboard(signal) {
  return request("/dashboard/regional", {}, signal);
}

export async function fetchDataSource(signal) {
  return request("/data-source", {}, signal);
}

export async function fetchNdviGridCache(signal) {
  return request("/ndvi-grid-cache", {}, signal);
}

// --- News API ---
export async function fetchNews(category = null, signal) {
  const params = new URLSearchParams();
  if (category) params.append("category", category);
  return request(`/news?${params}`, {}, signal, API_V1);
}

export async function fetchNewsById(id, signal) {
  return request(`/news/${id}`, {}, signal, API_V1);
}

// --- Auth API ---
export async function registerUser(email, displayName, password) {
  return request("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, display_name: displayName, password }),
  }, undefined, API_V1);
}

export async function loginUser(email, password) {
  return request("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }, undefined, API_V1);
}

export async function fetchMe() {
  return request("/auth/me", {}, undefined, API_V1);
}

export async function updatePreferences(prefs) {
  return request("/auth/preferences", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(prefs),
  }, undefined, API_V1);
}

// --- Donations API ---
export async function fetchDonations(signal) {
  return request("/donations", {}, signal, API_V1);
}

export async function createDonation(data) {
  return request("/donations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }, undefined, API_V1);
}

// --- Alerts API ---
export async function fetchAlerts(signal) {
  return request("/alerts", {}, signal, API_V1);
}

export async function acknowledgeAlert(id) {
  return request(`/alerts/${id}/acknowledge`, { method: "POST" }, undefined, API_V1);
}

// --- L3 Recommendations API ---
export async function fetchRecommendations(filters = {}, signal) {
  const params = new URLSearchParams();
  if (filters.status) params.append("status", filters.status);
  if (filters.action_code) params.append("action_code", filters.action_code);
  if (filters.approval_level) params.append("approval_level", filters.approval_level);
  if (filters.feature_id) params.append("feature_id", filters.feature_id);
  params.append("limit", String(filters.limit ?? 50));
  const qs = params.toString();
  return request(`/recommendations${qs ? `?${qs}` : ""}`, {}, signal, API_V1);
}

export async function evaluateRegion({ feature_id, region_geojson, override_data } = {}) {
  return request("/recommendations/evaluate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ feature_id, region_geojson, override_data }),
  }, undefined, API_V1);
}

export async function decideRecommendation(id, { decision, notes } = {}) {
  return request(`/recommendations/${id}/decision`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decision, notes }),
  }, undefined, API_V1);
}

// Module-level cache for the static action vocabulary (5 minute TTL).
let _actionCatalogCache = null;
let _actionCatalogTs = 0;
const ACTION_CATALOG_TTL_MS = 5 * 60 * 1000;

export async function fetchActionCatalog(signal) {
  const now = Date.now();
  if (_actionCatalogCache && now - _actionCatalogTs < ACTION_CATALOG_TTL_MS) {
    return _actionCatalogCache;
  }
  const data = await request("/actions", {}, signal, API_V1);
  _actionCatalogCache = data;
  _actionCatalogTs = now;
  return data;
}

export function clearActionCatalogCache() {
  _actionCatalogCache = null;
  _actionCatalogTs = 0;
}

export async function fetchActionDetail(code, signal) {
  return request(`/actions/${encodeURIComponent(code)}`, {}, signal, API_V1);
}

// --- L1 Sense API (GEE-backed signal sources) ---
export async function fetchSenseMulti({ geometry, year } = {}, signal) {
  return request("/sense/multi", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ geometry, year }),
  }, signal, API_V1);
}

export async function fetchElevation({ geometry } = {}, signal) {
  return request("/sense/elevation", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ geometry }),
  }, signal, API_V1);
}

export async function fetchRainfall({ geometry, year } = {}, signal) {
  return request("/sense/rainfall", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ geometry, year }),
  }, signal, API_V1);
}

export async function fetchSoilMoisture({ geometry } = {}, signal) {
  return request("/sense/soil-moisture", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ geometry }),
  }, signal, API_V1);
}
