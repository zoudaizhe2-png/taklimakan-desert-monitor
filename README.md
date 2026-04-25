# Taklimakan Desert Vegetation Tracker
### Guarding the Green Wall 🌿

Real-time satellite monitoring of vegetation along the Taklimakan Desert greenbelt using Google Earth Engine + Sentinel-2 data.

## Live Site
**[taklamakangreenwall.org](https://taklamakangreenwall.org/)** — frontend live on Cloudflare. Backend API deployment in progress (Railway).

## Quick Start

### Prerequisites
- Python 3.12+
- Node.js 20+
- Google Earth Engine service account (see below)

### 1. Clone the repo
```bash
git clone https://github.com/zoudaizhe2-png/taklimakan-desert-monitor.git
cd taklimakan-desert-monitor
```

### 2. Backend setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
```

### 3. Configure environment
```bash
cp .env.example .env
# Edit .env with your GEE credentials (see "GEE Setup" below)
```

### 4. Seed the database
```bash
python seed.py
```

### 5. Frontend setup
```bash
cd ../frontend
npm install
```

### 6. Run locally
```bash
# Terminal 1 (backend):
cd backend && python -m uvicorn main:app --reload --port 8000

# Terminal 2 (frontend):
cd frontend && npm run dev
```

Open http://localhost:5173

## GEE Setup (Google Earth Engine)

1. Go to https://console.cloud.google.com
2. Create a project (or use existing)
3. Enable the Earth Engine API
4. Create a service account + download JSON key
5. Register the service account at https://signup.earthengine.google.com/#!/service_accounts
6. Set these in your `.env`:
```
GEE_PROJECT=your-project-id
GEE_SERVICE_ACCOUNT_KEY=/path/to/your-key.json
GEE_SERVICE_ACCOUNT_EMAIL=your-sa@your-project.iam.gserviceaccount.com
```

Without GEE credentials, the app runs in demo mode with sample data.

## Deploy with Docker

```bash
docker build -t desert-tracker .
docker run -p 8000:8000 --env-file backend/.env desert-tracker
```

## Deploy to Railway

1. Connect your GitHub repo to Railway
2. Railway auto-detects the Dockerfile
3. Set environment variables in Railway dashboard:
   - `GEE_PROJECT`
   - `GEE_SERVICE_ACCOUNT_KEY` (paste the entire JSON content as a string)
   - `GEE_SERVICE_ACCOUNT_EMAIL`
   - `CORS_ORIGINS=https://your-domain.org`
4. Deploy

## Deploy to Cloudflare Pages + Railway

If using a custom domain on Cloudflare:
1. Deploy backend to Railway (gets a *.up.railway.app URL)
2. In Cloudflare DNS, add:
   - CNAME record: your-domain.org → your-app.up.railway.app
   - Or use Cloudflare Pages for frontend + Railway for API only
3. Set CORS_ORIGINS in Railway to your custom domain

## Project Structure

```
backend/          FastAPI backend (Python)
├── main.py       App entry point
├── routers/      API endpoints
├── services/     GEE integration, NDVI analysis
├── models/       Database models
└── tests/        Backend tests

frontend/         React frontend (Vite)
├── src/
│   ├── components/   Views and UI components
│   ├── hooks/        Custom React hooks
│   ├── i18n/         Translations (EN/ZH)
│   └── api/          API client
└── dist/             Built assets
```

## Features
- 🛰️ Real-time satellite NDVI data (Sentinel-2 via Google Earth Engine)
- 🗺️ Interactive illustrated map with click-to-inspect
- 📊 Time series analysis (2015-present)
- 🔬 Satellite playground for custom analysis
- 🐍 Snake robot field inspection concept
- 🌍 Bilingual (English + Chinese)
- 🌙 Dark/light theme
- 📱 Mobile responsive
- 🔐 User authentication (JWT)
- ⚡ Real-time updates (WebSocket)

## Tech Stack
- **Frontend:** React 19, Vite 8, Leaflet, Recharts
- **Backend:** FastAPI, SQLAlchemy 2.0, Uvicorn
- **Data:** Google Earth Engine, Sentinel-2, SQLite
- **Deploy:** Docker, Railway, GitHub Actions CI

## License
MIT — see [LICENSE](./LICENSE)
