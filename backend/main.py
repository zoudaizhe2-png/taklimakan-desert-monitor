"""Desert Vegetation Change Tracker - Backend API."""

import os
from pathlib import Path

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routers.analysis import router as analysis_router
from routers.features import router as features_router
from routers.dashboard_routes import router as dashboard_router

app = FastAPI(
    title="Taklimakan Desert Monitor",
    description="Interactive monitoring of vegetation, projects, and desert containment around the Taklimakan Desert",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analysis_router)
app.include_router(features_router)
app.include_router(dashboard_router)

# Serve built frontend in production
STATIC_DIR = Path(__file__).parent / "static"
if STATIC_DIR.exists():
    app.mount("/", StaticFiles(directory=str(STATIC_DIR), html=True), name="static")
else:
    @app.get("/")
    def root():
        return {"name": "Taklimakan Desert Monitor API", "version": "1.0.0", "docs": "/docs"}
