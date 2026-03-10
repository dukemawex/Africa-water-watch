"""FastAPI application entry point."""
import logging
from contextlib import asynccontextmanager

import redis.asyncio as aioredis
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.database import engine, Base
from app.routers import auth, water_points, readings, maintenance, ai, alerts, satellite
from app.services.scheduler import start_scheduler, stop_scheduler

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    start_scheduler()
    logger.info("AquaWatch Africa backend started")
    yield
    # Shutdown
    stop_scheduler()
    await engine.dispose()


app = FastAPI(
    title="AquaWatch Africa API",
    version=settings.APP_VERSION,
    description="Water quality monitoring platform for Africa",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router, prefix="/api")
app.include_router(water_points.router, prefix="/api")
app.include_router(readings.router, prefix="/api")
app.include_router(maintenance.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(alerts.router, prefix="/api")
app.include_router(satellite.router, prefix="/api")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    db_ok = False
    redis_ok = False

    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception:
        pass

    try:
        r = aioredis.from_url(settings.REDIS_URL)
        await r.ping()
        await r.aclose()
        redis_ok = True
    except Exception:
        pass

    return {
        "status": "ok",
        "db_connected": db_ok,
        "redis_connected": redis_ok,
        "version": settings.APP_VERSION,
        "environment": settings.APP_ENV,
    }
