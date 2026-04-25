"""WebSocket endpoint for real-time updates."""

import asyncio
import json
import math
import random
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from websocket import manager

router = APIRouter()

# Hard cap on concurrent WebSocket clients. Beyond this we reject new
# connections with policy-violation close code so a single rogue client
# can't exhaust file descriptors / event loop tasks.
MAX_WS_CONNECTIONS = 100


@router.websocket("/api/v1/ws")
async def websocket_endpoint(websocket: WebSocket):
    if len(manager.active_connections) >= MAX_WS_CONNECTIONS:
        await websocket.close(code=1008, reason="Server full")
        return

    await manager.connect(websocket)
    telemetry_task = asyncio.create_task(_send_telemetry(websocket))
    try:
        while True:
            data = await websocket.receive_text()
            # Handle incoming messages (e.g., subscriptions)
            try:
                msg = json.loads(data)
                if msg.get("type") == "ping":
                    await manager.send_personal(websocket, {"type": "pong"})
            except json.JSONDecodeError:
                pass
    except WebSocketDisconnect:
        pass
    finally:
        # Always cancel the telemetry task and disconnect, even on unexpected exceptions.
        telemetry_task.cancel()
        try:
            await telemetry_task
        except (asyncio.CancelledError, Exception):
            pass
        manager.disconnect(websocket)


async def _send_telemetry(websocket: WebSocket):
    """Send simulated snake robot telemetry every 3 seconds."""
    rng = random.Random()
    tick = 0
    try:
        while True:
            await asyncio.sleep(3)
            tick += 1
            # Simulated robot position along desert highway
            base_lat = 38.5 + math.sin(tick * 0.05) * 0.3
            base_lng = 83.5 + tick * 0.001

            telemetry = {
                "type": "telemetry",
                "robot_id": "snake-01",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "lat": round(base_lat + rng.uniform(-0.01, 0.01), 5),
                "lng": round(base_lng + rng.uniform(-0.01, 0.01), 5),
                "battery": max(10, 95 - tick * 0.5 + rng.uniform(-2, 2)),
                "temperature": round(35 + rng.uniform(-5, 10), 1),
                "soil_moisture": round(0.08 + rng.uniform(-0.03, 0.05), 3),
                "ndvi_local": round(0.15 + rng.uniform(-0.05, 0.1), 3),
                "speed_mps": round(0.3 + rng.uniform(-0.1, 0.15), 2),
            }
            await manager.send_personal(websocket, telemetry)
    except asyncio.CancelledError:
        pass
