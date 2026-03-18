# CLAUDE.md — Desert Tracker

## Key Conventions

- **Backend:** FastAPI + Pydantic, Python 3.12. All GEE-calling endpoints are async with `asyncio.to_thread()`. Input validation via Pydantic field validators. Rate limiting via slowapi. Structured logging via structlog.
- **Frontend:** React 19 + Vite 8. No TypeScript. Components in `frontend/src/components/`. Hooks in `frontend/src/hooks/`.
- **Database:** SQLite + SQLAlchemy 2.0 async (aiosqlite). Models in `backend/models/`. Init on app startup. Seed with `python seed.py`.
- **Auth:** JWT tokens via python-jose. Passwords hashed with bcrypt/passlib. `get_current_user` dependency (optional), `require_user` (required). Token in `localStorage` as `auth_token`.
- **API Versioning:** Existing endpoints at `/api/`. New endpoints at `/api/v1/` (news, auth, alerts, donations, ws).
- **WebSocket:** `WS /api/v1/ws` for real-time telemetry, alerts, heartbeat. Frontend hook: `useWebSocket()`.
- **i18n:** All user-facing strings go through `useLanguage().t(key)` with keys defined in `frontend/src/i18n/translations.js`. Some component data constants use inline `lang === "zh" ? ... : ...` patterns.
- **Theming:** CSS custom properties in `index.css`. Dark/light via `[data-theme]` attribute. Toggle with `ThemeToggle` component.
- **Error handling:** API client (`frontend/src/api/client.js`) throws `ApiError` with structured messages. Catch blocks should surface errors to users, never swallow silently.
- **Caching:** Server-side TTL cache in `backend/cache.py` (async lock, dict-based). Frontend cache via `useDataCache` hook.
- **CORS:** Env-driven allowlist via `CORS_ORIGINS`, not `*`.

## Running Tests

```bash
cd backend && pytest tests/ -v
cd frontend && npm test && npm run lint && npm run build
```

## Important Files

- `backend/main.py` — App setup, CORS, rate limiting, exception handlers, DB init, WebSocket
- `backend/database.py` — Async SQLAlchemy engine, session factory, Base
- `backend/auth.py` — JWT creation/verification, password hashing, auth dependencies
- `backend/cache.py` — Server-side TTL cache with async lock
- `backend/models/` — ORM models (Feature, NewsArticle, User, Alert, Donation, DashboardSnapshot)
- `backend/routers/` — API routes (analysis, features, dashboard, news, auth, alerts, donations, ws)
- `backend/middleware.py` — Request logging middleware (structlog)
- `frontend/src/App.jsx` — Main app shell, uses lazy loading for views
- `frontend/src/hooks/useMapState.js` — Core map state + API orchestration
- `frontend/src/hooks/useWebSocket.js` — WebSocket connection with reconnect
- `frontend/src/contexts/AuthContext.jsx` — Auth state (login/register/logout)
- `frontend/src/components/IllustratedMap.jsx` — 800+ LOC SVG tile map (memoized)
